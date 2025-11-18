// PeopleTrustPay Authentication Service
// OAuth2, biometric login, 2FA implementation

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import speakeasy from 'speakeasy'
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { z } from 'zod'

export interface User {
  id: string
  email: string
  passwordHash: string
  phoneNumber?: string
  kycLevel: 'basic' | 'verified' | 'premium'
  twoFactorEnabled: boolean
  biometricEnabled: boolean
  twoFactorSecret?: string
  biometricCredentialId?: string
  biometricPublicKey?: string
  sessionId?: string
  createdAt: Date
  lastLoginAt?: Date
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface OAuth2State {
  code: string
  codeChallenge: string
  codeChallengeMethod: 'S256' | 'plain'
  redirectUri: string
  clientId: string
  userId: string
  expiresAt: Date
}

export interface Session {
  id: string
  userId: string
  deviceInfo: {
    userAgent: string
    ip: string
    fingerprint: string
  }
  createdAt: Date
  lastActivityAt: Date
  expiresAt: Date
  isActive: boolean
}

export class AuthService {
  private jwtSecret: string
  private rateLimiter: RateLimiterMemory
  private oauth2States: Map<string, OAuth2State> = new Map()
  private sessions: Map<string, Session> = new Map()

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'dev-secret-key'
    this.rateLimiter = new RateLimiterMemory({
      keyPrefix: 'auth',
      points: 10, // Number of requests
      duration: 60, // Per 60 seconds
    })
  }

  async signup(email: string, password: string, phoneNumber?: string): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      // Rate limiting check
      await this.rateLimiter.consume(email)

      // Validate input
      const signupSchema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
        phoneNumber: z.string().optional()
      })
      signupSchema.parse({ email, password, phoneNumber })

      // Check if user exists
      const existingUser = await this.getUserByEmail(email)
      if (existingUser) {
        throw new Error('User already exists')
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12)

      // Create user
      const user: User = {
        id: randomUUID(),
        email,
        passwordHash,
        phoneNumber,
        kycLevel: 'basic',
        twoFactorEnabled: false,
        biometricEnabled: false,
        createdAt: new Date()
      }

      // TODO: Save to database

      // Create session
      const session = await this.createSession(user.id, {
        userAgent: 'unknown',
        ip: 'unknown',
        fingerprint: randomUUID()
      })

      // Generate tokens
      const tokens = this.generateTokens(user.id, session.id)

      return { user, tokens }
    } catch (error) {
      console.error('Signup error:', error)
      throw error
    }
  }

  async login(email: string, password: string, deviceInfo?: { userAgent: string; ip: string; fingerprint: string }): Promise<{ user: User; tokens: AuthTokens; requiresMFA?: boolean }> {
    try {
      // Rate limiting check
      await this.rateLimiter.consume(email)

      // Validate input
      const loginSchema = z.object({
        email: z.string().email(),
        password: z.string().min(1)
      })
      loginSchema.parse({ email, password })

      // Fetch user from database
      const user = await this.getUserByEmail(email)
      if (!user) {
        throw new Error('Invalid credentials')
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.passwordHash)
      if (!isValid) {
        throw new Error('Invalid credentials')
      }

      // Check if MFA is required
      if (user.twoFactorEnabled) {
        return { user, tokens: { accessToken: '', refreshToken: '', expiresIn: 0 }, requiresMFA: true }
      }

      // Update last login
      user.lastLoginAt = new Date()
      // TODO: Update in database

      // Create session
      const session = await this.createSession(user.id, deviceInfo || {
        userAgent: 'unknown',
        ip: 'unknown',
        fingerprint: randomUUID()
      })

      // Generate tokens
      const tokens = this.generateTokens(user.id, session.id)

      return { user, tokens }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  async verifyToken(token: string, sessionId?: string): Promise<{ userId: string; sessionId?: string } | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { userId: string; sessionId?: string; type: string }

      // Validate session if provided
      if (sessionId && decoded.sessionId !== sessionId) {
        return null
      }

      // Check if session is active
      if (decoded.sessionId) {
        const session = this.sessions.get(decoded.sessionId)
        if (!session || !session.isActive || session.expiresAt < new Date()) {
          return null
        }
        // Update last activity
        session.lastActivityAt = new Date()
      }

      return { userId: decoded.userId, sessionId: decoded.sessionId }
    } catch (error) {
      return null
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtSecret) as { userId: string; sessionId: string; type: string }

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type')
      }

      // Validate session
      const session = this.sessions.get(decoded.sessionId)
      if (!session || !session.isActive) {
        throw new Error('Session expired')
      }

      return this.generateTokens(decoded.userId, decoded.sessionId)
    } catch (error) {
      console.error('Refresh token error:', error)
      throw new Error('Invalid refresh token')
    }
  }

  async setupTwoFactor(userId: string): Promise<{ secret: string; qrCode: string }> {
    try {
      const user = await this.getUserById(userId)
      if (!user) {
        throw new Error('User not found')
      }

      const secret = speakeasy.generateSecret({
        name: `PeopleTrustPay (${user.email})`,
        issuer: 'PeopleTrustPay'
      })

      user.twoFactorSecret = secret.base32
      user.twoFactorEnabled = false // Will be enabled after verification
      // TODO: Save to database

      return {
        secret: secret.base32,
        qrCode: secret.otpauth_url || ''
      }
    } catch (error) {
      console.error('Setup 2FA error:', error)
      throw error
    }
  }

  async verifyTwoFactor(userId: string, code: string): Promise<boolean> {
    try {
      const user = await this.getUserById(userId)
      if (!user || !user.twoFactorSecret) {
        return false
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: code,
        window: 2 // Allow 2 time windows (30 seconds each)
      })

      if (verified && !user.twoFactorEnabled) {
        user.twoFactorEnabled = true
        // TODO: Save to database
      }

      return verified
    } catch (error) {
      console.error('Verify 2FA error:', error)
      return false
    }
  }

  async setupBiometric(userId: string): Promise<any> {
    try {
      const user = await this.getUserById(userId)
      if (!user) {
        throw new Error('User not found')
      }

      const options = generateRegistrationOptions({
        rpName: 'PeopleTrustPay',
        rpID: process.env.RP_ID || 'localhost',
        userID: userId,
        userName: user.email,
        userDisplayName: user.email,
        attestationType: 'direct',
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'required'
        }
      })

      // Store challenge temporarily
      // TODO: Store in Redis with expiration

      return options
    } catch (error) {
      console.error('Setup biometric error:', error)
      throw error
    }
  }

  async verifyBiometricSetup(userId: string, response: any): Promise<boolean> {
    try {
      const user = await this.getUserById(userId)
      if (!user) {
        throw new Error('User not found')
      }

      // TODO: Get stored challenge from Redis

      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: 'stored-challenge', // TODO: Get from Redis
        expectedOrigin: process.env.EXPECTED_ORIGIN || 'http://localhost:3000',
        expectedRPID: process.env.RP_ID || 'localhost'
      })

      if (verification.verified) {
        user.biometricEnabled = true
        user.biometricCredentialId = verification.registrationInfo?.credentialID?.toString() || ''
        user.biometricPublicKey = verification.registrationInfo?.credentialPublicKey?.toString() || ''
        // TODO: Save to database
      }

      return verification.verified
    } catch (error) {
      console.error('Verify biometric setup error:', error)
      return false
    }
  }

  async authenticateBiometric(userId: string): Promise<any> {
    try {
      const user = await this.getUserById(userId)
      if (!user || !user.biometricEnabled) {
        throw new Error('Biometric not enabled')
      }

      const options = generateAuthenticationOptions({
        rpID: process.env.RP_ID || 'localhost',
        userVerification: 'required',
        allowCredentials: [{
          id: Buffer.from(user.biometricCredentialId!, 'base64'),
          type: 'public-key'
        }]
      })

      // TODO: Store challenge in Redis

      return options
    } catch (error) {
      console.error('Authenticate biometric error:', error)
      throw error
    }
  }

  async verifyBiometricAuth(userId: string, response: any): Promise<boolean> {
    try {
      const user = await this.getUserById(userId)
      if (!user || !user.biometricEnabled) {
        return false
      }

      // TODO: Get stored challenge from Redis

      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: 'stored-challenge', // TODO: Get from Redis
        expectedOrigin: process.env.EXPECTED_ORIGIN || 'http://localhost:3000',
        expectedRPID: process.env.RP_ID || 'localhost',
        authenticator: {
          credentialID: Buffer.from(user.biometricCredentialId!, 'base64'),
          credentialPublicKey: Buffer.from(user.biometricPublicKey!, 'base64'),
          counter: 0 // TODO: Store and retrieve counter
        }
      })

      return verification.verified
    } catch (error) {
      console.error('Verify biometric auth error:', error)
      return false
    }
  }

  // OAuth2 PKCE Implementation
  async initiateOAuth2(clientId: string, redirectUri: string, codeChallenge: string, codeChallengeMethod: 'S256' | 'plain' = 'S256'): Promise<{ state: string; authorizationUrl: string }> {
    try {
      const state = randomUUID()
      const code = randomUUID()

      const oauthState: OAuth2State = {
        code,
        codeChallenge,
        codeChallengeMethod,
        redirectUri,
        clientId,
        userId: '', // Will be set after user authentication
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      }

      this.oauth2States.set(state, oauthState)

      // In a real implementation, this would redirect to a login page
      const authorizationUrl = `/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=${codeChallengeMethod}`

      return { state, authorizationUrl }
    } catch (error) {
      console.error('OAuth2 initiation error:', error)
      throw error
    }
  }

  async completeOAuth2(state: string, userId: string, codeVerifier: string): Promise<{ code: string; redirectUri: string }> {
    try {
      const oauthState = this.oauth2States.get(state)
      if (!oauthState || oauthState.expiresAt < new Date()) {
        throw new Error('Invalid or expired OAuth2 state')
      }

      // Verify PKCE
      const isValidChallenge = await this.verifyPKCE(codeVerifier, oauthState.codeChallenge, oauthState.codeChallengeMethod)
      if (!isValidChallenge) {
        throw new Error('Invalid PKCE verifier')
      }

      oauthState.userId = userId
      this.oauth2States.set(state, oauthState)

      return {
        code: oauthState.code,
        redirectUri: oauthState.redirectUri
      }
    } catch (error) {
      console.error('OAuth2 completion error:', error)
      throw error
    }
  }

  async exchangeOAuth2Code(code: string, codeVerifier: string, clientId: string): Promise<AuthTokens> {
    try {
      // Find the OAuth2 state by code
      const stateEntry = Array.from(this.oauth2States.entries()).find(([_, state]) => state.code === code)
      if (!stateEntry) {
        throw new Error('Invalid authorization code')
      }

      const [state, oauthState] = stateEntry

      if (oauthState.clientId !== clientId || oauthState.expiresAt < new Date()) {
        throw new Error('Invalid or expired authorization code')
      }

      // Verify PKCE
      const isValidChallenge = await this.verifyPKCE(codeVerifier, oauthState.codeChallenge, oauthState.codeChallengeMethod)
      if (!isValidChallenge) {
        throw new Error('Invalid PKCE verifier')
      }

      // Clean up the state
      this.oauth2States.delete(state)

      // Create session and tokens
      const session = await this.createSession(oauthState.userId, {
        userAgent: 'oauth-client',
        ip: 'unknown',
        fingerprint: randomUUID()
      })

      return this.generateTokens(oauthState.userId, session.id)
    } catch (error) {
      console.error('OAuth2 code exchange error:', error)
      throw error
    }
  }

  private async verifyPKCE(verifier: string, challenge: string, method: 'S256' | 'plain'): Promise<boolean> {
    if (method === 'plain') {
      return verifier === challenge
    } else {
      // S256 method
      const crypto = await import('crypto')
      const hash = crypto.createHash('sha256').update(verifier).digest('base64url')
      return hash === challenge
    }
  }

  private async createSession(userId: string, deviceInfo: { userAgent: string; ip: string; fingerprint: string }): Promise<Session> {
    const session: Session = {
      id: randomUUID(),
      userId,
      deviceInfo,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      isActive: true
    }

    this.sessions.set(session.id, session)
    // TODO: Save to Redis

    return session
  }

  async getActiveSessions(userId: string): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(session =>
      session.userId === userId && session.isActive && session.expiresAt > new Date()
    )
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session && session.userId === userId) {
      session.isActive = false
      // TODO: Update in Redis
    }
  }

  private generateTokens(userId: string, sessionId?: string): AuthTokens {
    const payload = { userId, type: 'access' as const }
    if (sessionId) {
      (payload as any).sessionId = sessionId
    }

    const accessToken = jwt.sign(payload, this.jwtSecret, { expiresIn: '15m' })

    const refreshPayload = { userId, type: 'refresh' as const }
    if (sessionId) {
      (refreshPayload as any).sessionId = sessionId
    }

    const refreshToken = jwt.sign(refreshPayload, this.jwtSecret, { expiresIn: '7d' })

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60 // 15 minutes in seconds
    }
  }

  private async getUserByEmail(email: string): Promise<User | null> {
    // TODO: Implement database query
    return null
  }

  private async getUserById(userId: string): Promise<User | null> {
    // TODO: Implement database query
    return null
  }
}

export default new AuthService()
