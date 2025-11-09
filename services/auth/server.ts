import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { AuthService } from './index'
import { z } from 'zod'

const app = express()
const authService = new AuthService()
const PORT = process.env.PORT || 3001

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth', timestamp: new Date().toISOString() })
})

// Signup endpoint
app.post('/auth/signup', async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      phoneNumber: z.string().optional()
    })

    const { email, password, phoneNumber } = schema.parse(req.body)
    const result = await authService.signup(email, password, phoneNumber)

    res.json(result)
  } catch (error) {
    console.error('Signup error:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : 'Signup failed' })
  }
})

// Login endpoint
app.post('/auth/login', async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(1),
      userAgent: z.string().optional(),
      ip: z.string().optional(),
      fingerprint: z.string().optional()
    })

    const { email, password, userAgent, ip, fingerprint } = schema.parse(req.body)
    const deviceInfo = userAgent && ip && fingerprint ? { userAgent, ip, fingerprint } : undefined

    const result = await authService.login(email, password, deviceInfo)

    res.json(result)
  } catch (error) {
    console.error('Login error:', error)
    res.status(401).json({ error: error instanceof Error ? error.message : 'Login failed' })
  }
})

// Refresh token endpoint
app.post('/auth/refresh', async (req, res) => {
  try {
    const schema = z.object({
      refreshToken: z.string()
    })

    const { refreshToken } = schema.parse(req.body)
    const tokens = await authService.refreshToken(refreshToken)

    res.json(tokens)
  } catch (error) {
    console.error('Refresh token error:', error)
    res.status(401).json({ error: error instanceof Error ? error.message : 'Token refresh failed' })
  }
})

// 2FA setup endpoint
app.post('/auth/2fa/setup', async (req, res) => {
  try {
    const schema = z.object({
      userId: z.string()
    })

    const { userId } = schema.parse(req.body)
    const result = await authService.setupTwoFactor(userId)

    res.json(result)
  } catch (error) {
    console.error('2FA setup error:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : '2FA setup failed' })
  }
})

// 2FA verification endpoint
app.post('/auth/2fa/verify', async (req, res) => {
  try {
    const schema = z.object({
      userId: z.string(),
      code: z.string()
    })

    const { userId, code } = schema.parse(req.body)
    const verified = await authService.verifyTwoFactor(userId, code)

    res.json({ verified })
  } catch (error) {
    console.error('2FA verification error:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : '2FA verification failed' })
  }
})

// Biometric setup endpoint
app.post('/auth/biometric/setup', async (req, res) => {
  try {
    const schema = z.object({
      userId: z.string()
    })

    const { userId } = schema.parse(req.body)
    const options = await authService.setupBiometric(userId)

    res.json(options)
  } catch (error) {
    console.error('Biometric setup error:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : 'Biometric setup failed' })
  }
})

// Biometric verification endpoint
app.post('/auth/biometric/verify-setup', async (req, res) => {
  try {
    const schema = z.object({
      userId: z.string(),
      response: z.any()
    })

    const { userId, response } = schema.parse(req.body)
    const verified = await authService.verifyBiometricSetup(userId, response)

    res.json({ verified })
  } catch (error) {
    console.error('Biometric verification error:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : 'Biometric verification failed' })
  }
})

// Biometric authentication endpoint
app.post('/auth/biometric/authenticate', async (req, res) => {
  try {
    const schema = z.object({
      userId: z.string()
    })

    const { userId } = schema.parse(req.body)
    const options = await authService.authenticateBiometric(userId)

    res.json(options)
  } catch (error) {
    console.error('Biometric authentication error:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : 'Biometric authentication failed' })
  }
})

// Biometric auth verification endpoint
app.post('/auth/biometric/verify-auth', async (req, res) => {
  try {
    const schema = z.object({
      userId: z.string(),
      response: z.any()
    })

    const { userId, response } = schema.parse(req.body)
    const verified = await authService.verifyBiometricAuth(userId, response)

    res.json({ verified })
  } catch (error) {
    console.error('Biometric auth verification error:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : 'Biometric auth verification failed' })
  }
})

// OAuth2 endpoints
app.get('/oauth/authorize', async (req, res) => {
  try {
    const schema = z.object({
      client_id: z.string(),
      redirect_uri: z.string(),
      code_challenge: z.string(),
      code_challenge_method: z.enum(['S256', 'plain']).optional(),
      state: z.string().optional()
    })

    const { client_id, redirect_uri, code_challenge, code_challenge_method = 'S256' } = schema.parse(req.query)

    const result = await authService.initiateOAuth2(client_id, redirect_uri, code_challenge, code_challenge_method)

    // In a real implementation, redirect to login page
    res.json({ authorizationUrl: result.authorizationUrl, state: result.state })
  } catch (error) {
    console.error('OAuth2 authorize error:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : 'OAuth2 authorization failed' })
  }
})

app.post('/oauth/token', async (req, res) => {
  try {
    const schema = z.object({
      grant_type: z.literal('authorization_code'),
      code: z.string(),
      code_verifier: z.string(),
      client_id: z.string(),
      redirect_uri: z.string()
    })

    const { code, code_verifier, client_id } = schema.parse(req.body)
    const tokens = await authService.exchangeOAuth2Code(code, code_verifier, client_id)

    res.json({
      access_token: tokens.accessToken,
      token_type: 'Bearer',
      expires_in: tokens.expiresIn,
      refresh_token: tokens.refreshToken
    })
  } catch (error) {
    console.error('OAuth2 token error:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : 'OAuth2 token exchange failed' })
  }
})

// Session management endpoints
app.get('/auth/sessions', async (req, res) => {
  try {
    // TODO: Extract userId from JWT token
    const userId = req.headers['user-id'] as string
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const sessions = await authService.getActiveSessions(userId)
    res.json({ sessions })
  } catch (error) {
    console.error('Get sessions error:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to get sessions' })
  }
})

app.delete('/auth/sessions/:sessionId', async (req, res) => {
  try {
    // TODO: Extract userId from JWT token
    const userId = req.headers['user-id'] as string
    const { sessionId } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    await authService.revokeSession(sessionId, userId)
    res.json({ message: 'Session revoked' })
  } catch (error) {
    console.error('Revoke session error:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to revoke session' })
  }
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  process.exit(0)
})

app.listen(PORT, () => {
  console.log(`Auth service listening on port ${PORT}`)
})
