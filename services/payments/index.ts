// Finthos Payments Service
// Core payment processing, transfers, and transaction management

import { randomUUID } from 'crypto'
import { z } from 'zod'
import Decimal from 'decimal.js'
import Queue from 'bull'
import { EventEmitter } from 'events'

export interface PaymentMethod {
  id: string
  userId: string
  type: 'bank_account' | 'card' | 'crypto_wallet'
  provider: 'stripe' | 'plaid' | 'metamask' | 'internal'
  displayName: string
  last4: string
  isDefault: boolean
  isVerified: boolean
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface Transaction {
  id: string
  type: 'send' | 'receive' | 'transfer' | 'deposit' | 'withdrawal'
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  amount: Decimal
  currency: 'USD' | 'EUR' | 'BTC' | 'ETH' | 'USDC' | 'EURC'
  fromUserId?: string
  toUserId?: string
  fromMethod?: string
  toMethod?: string
  fee: Decimal
  exchangeRate?: Decimal
  description?: string
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  failedAt?: Date
  failureReason?: string
}

export interface CurrencyExchangeRate {
  from: string
  to: string
  rate: Decimal
  timestamp: Date
  source: string
}

export interface TransactionLimits {
  daily: Decimal
  monthly: Decimal
  perTransaction: Decimal
  currency: string
}

export interface PaymentValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface TransferRequest {
  fromUserId: string
  toUserId?: string
  toEmail?: string
  toPhone?: string
  amount: Decimal | number
  currency: string
  description?: string
  paymentMethodId?: string
  priority?: 'standard' | 'express' | 'instant'
}

export interface FeeCalculation {
  baseFee: Decimal
  percentageFee: Decimal
  totalFee: Decimal
  currency: string
  breakdown: {
    networkFee?: Decimal
    processingFee?: Decimal
    exchangeFee?: Decimal
  }
}

export interface RealTimeTransaction {
  id: string
  status: 'pending' | 'confirmed' | 'finalized'
  confirmations: number
  estimatedCompletionTime: Date
  currentBlock?: number
  requiredConfirmations: number
}

export class PaymentsService extends EventEmitter {
  private transactionQueue: Queue.Queue
  private exchangeRates: Map<string, CurrencyExchangeRate> = new Map()

  constructor() {
    super()
    this.transactionQueue = new Queue('payment-processing', {
      redis: process.env.REDIS_URL || 'redis://localhost:6379'
    })

    this.transactionQueue.process(async (job) => {
      return await this.processPaymentJob(job.data)
    })

    this.initializeExchangeRates()
  }

  async sendMoney(request: TransferRequest): Promise<Transaction> {
    try {
      // Validate request
      const validation = await this.validateTransferRequest(request)
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
      }

      // Convert amount to Decimal
      const amount = new Decimal(request.amount)

      // Check transaction limits
      await this.checkTransactionLimits(request.fromUserId, amount, request.currency)

      // Get exchange rate if needed
      const exchangeRate = await this.getExchangeRate(request.currency, 'USD')

      // Calculate fees
      const feeCalculation = await this.calculateFee(amount, request.currency, request.priority || 'standard')

      // Create transaction
      const transaction: Transaction = {
        id: randomUUID(),
        type: 'send',
        status: 'pending',
        amount,
        currency: request.currency as any,
        fromUserId: request.fromUserId,
        toUserId: request.toUserId,
        fee: feeCalculation.totalFee,
        exchangeRate,
        description: request.description,
        metadata: {
          toEmail: request.toEmail,
          toPhone: request.toPhone,
          priority: request.priority,
          feeBreakdown: feeCalculation.breakdown
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // TODO: Save to database

      // Queue for processing
      await this.transactionQueue.add('process-payment', { transactionId: transaction.id }, {
        priority: request.priority === 'express' ? 1 : (request.priority === 'instant' ? 0 : 2),
        delay: request.priority === 'instant' ? 0 : 5000 // 5 second delay for non-instant
      })

      this.emit('transaction-created', transaction)

      return transaction
    } catch (error) {
      console.error('Send money error:', error)
      throw error
    }
  }

  async receiveMoney(transactionId: string, userId: string): Promise<Transaction> {
    try {
      const transaction = await this.getTransaction(transactionId)

      if (!transaction) {
        throw new Error('Transaction not found')
      }

      if (transaction.toUserId !== userId) {
        throw new Error('Unauthorized')
      }

      if (transaction.status !== 'pending') {
        throw new Error('Transaction cannot be accepted')
      }

      // Update transaction status
      transaction.status = 'completed'
      transaction.completedAt = new Date()
      transaction.updatedAt = new Date()

      // TODO: Update in database
      // TODO: Update user balances

      this.emit('transaction-completed', transaction)

      return transaction
    } catch (error) {
      console.error('Receive money error:', error)
      throw error
    }
  }

  async requestMoney(fromUserId: string, toUserId: string, amount: number, description?: string): Promise<Transaction> {
    const transaction: Transaction = {
      id: randomUUID(),
      type: 'receive',
      status: 'pending',
      amount,
      currency: 'USD',
      fromUserId: toUserId, // Request from
      toUserId: fromUserId, // Request to
      fee: 0,
      description,
      metadata: {},
      createdAt: new Date()
    }

    // TODO: Send notification to requested user
    // TODO: Save to database
    
    return transaction
  }

  async addPaymentMethod(userId: string, method: Omit<PaymentMethod, 'id' | 'userId' | 'createdAt'>): Promise<PaymentMethod> {
    const paymentMethod: PaymentMethod = {
      id: randomUUID(),
      userId,
      ...method,
      createdAt: new Date()
    }

    // TODO: Verify payment method with provider
    // TODO: Save to database
    
    return paymentMethod
  }

  async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    // TODO: Fetch from database
    return []
  }

  async getUserTransactions(userId: string, limit = 50, offset = 0): Promise<Transaction[]> {
    // TODO: Fetch from database with pagination
    return []
  }

  async getTransaction(transactionId: string): Promise<Transaction | null> {
    // TODO: Fetch from database
    return null
  }

  async processRefund(transactionId: string, reason?: string): Promise<Transaction> {
    const originalTransaction = await this.getTransaction(transactionId)
    
    if (!originalTransaction) {
      throw new Error('Transaction not found')
    }
    
    if (originalTransaction.status !== 'completed') {
      throw new Error('Can only refund completed transactions')
    }

    const refundTransaction: Transaction = {
      id: randomUUID(),
      type: 'transfer',
      status: 'processing',
      amount: -originalTransaction.amount,
      currency: originalTransaction.currency,
      fromUserId: originalTransaction.toUserId,
      toUserId: originalTransaction.fromUserId,
      fee: 0,
      description: `Refund for transaction ${originalTransaction.id}`,
      metadata: {
        originalTransactionId: originalTransaction.id,
        refundReason: reason
      },
      createdAt: new Date()
    }

    // TODO: Process refund through provider
    await this.processPayment(refundTransaction)
    
    return refundTransaction
  }

  private async validateTransferRequest(request: TransferRequest): Promise<PaymentValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate amount
    const amount = new Decimal(request.amount)
    if (amount.lte(0)) {
      errors.push('Amount must be greater than 0')
    }

    // Validate currency
    const supportedCurrencies = ['USD', 'EUR', 'BTC', 'ETH', 'USDC', 'EURC']
    if (!supportedCurrencies.includes(request.currency)) {
      errors.push(`Unsupported currency: ${request.currency}`)
    }

    // Validate recipient
    if (!request.toUserId && !request.toEmail && !request.toPhone) {
      errors.push('Recipient must be specified (userId, email, or phone)')
    }

    // Check for suspicious patterns
    if (amount.gt(10000)) {
      warnings.push('Large transaction amount detected')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  private async checkTransactionLimits(userId: string, amount: Decimal, currency: string): Promise<void> {
    // TODO: Implement actual limit checking from database
    const limits: TransactionLimits = {
      daily: new Decimal(50000),
      monthly: new Decimal(200000),
      perTransaction: new Decimal(10000),
      currency: 'USD'
    }

    if (amount.gt(limits.perTransaction)) {
      throw new Error(`Transaction exceeds per-transaction limit of ${limits.perTransaction} ${limits.currency}`)
    }

    // TODO: Check daily and monthly limits
  }

  private async calculateFee(amount: Decimal, currency: string, priority: string = 'standard'): Promise<FeeCalculation> {
    const baseFee = new Decimal(0.25) // Base fee
    const percentageFee = amount.mul(0.01) // 1% fee

    let priorityMultiplier = new Decimal(1)
    if (priority === 'express') priorityMultiplier = new Decimal(1.5)
    if (priority === 'instant') priorityMultiplier = new Decimal(2)

    const networkFee = currency.startsWith('BTC') || currency.startsWith('ETH') ?
      new Decimal(0.001) : new Decimal(0) // Crypto network fees

    const totalFee = Decimal.max(baseFee, percentageFee).mul(priorityMultiplier).add(networkFee)

    return {
      baseFee,
      percentageFee,
      totalFee,
      currency,
      breakdown: {
        networkFee,
        processingFee: totalFee.sub(networkFee),
        exchangeFee: new Decimal(0) // TODO: Add exchange fees
      }
    }
  }

  private async getExchangeRate(from: string, to: string): Promise<Decimal | undefined> {
    if (from === to) return new Decimal(1)

    const key = `${from}-${to}`
    const rate = this.exchangeRates.get(key)

    if (!rate || rate.timestamp < new Date(Date.now() - 5 * 60 * 1000)) { // 5 minutes old
      // TODO: Fetch fresh rates from external API
      return new Decimal(1) // Placeholder
    }

    return rate.rate
  }

  private async initializeExchangeRates(): Promise<void> {
    // TODO: Initialize with real exchange rates
    this.exchangeRates.set('BTC-USD', {
      from: 'BTC',
      to: 'USD',
      rate: new Decimal(45000),
      timestamp: new Date(),
      source: 'coinbase'
    })

    this.exchangeRates.set('ETH-USD', {
      from: 'ETH',
      to: 'USD',
      rate: new Decimal(3000),
      timestamp: new Date(),
      source: 'coinbase'
    })
  }

  private async processPaymentJob(jobData: { transactionId: string }): Promise<void> {
    try {
      const transaction = await this.getTransaction(jobData.transactionId)
      if (!transaction) {
        throw new Error('Transaction not found')
      }

      transaction.status = 'processing'
      transaction.updatedAt = new Date()

      // TODO: Process through appropriate payment provider
      if (transaction.currency === 'USD' || transaction.currency === 'EUR') {
        await this.processFiatPayment(transaction)
      } else {
        await this.processCryptoPayment(transaction)
      }

      this.emit('transaction-processed', transaction)
    } catch (error) {
      console.error('Payment processing error:', error)
      // TODO: Update transaction status to failed
      throw error
    }
  }

  private async processFiatPayment(transaction: Transaction): Promise<void> {
    // TODO: Integrate with Stripe/Plaid
    // Simulate processing
    setTimeout(() => {
      transaction.status = 'completed'
      transaction.completedAt = new Date()
      transaction.updatedAt = new Date()
    }, 2000)
  }

  private async processCryptoPayment(transaction: Transaction): Promise<void> {
    // TODO: Integrate with Web3 providers
    // Simulate processing
    setTimeout(() => {
      transaction.status = 'completed'
      transaction.completedAt = new Date()
      transaction.updatedAt = new Date()
    }, 3000)
  }

  async getRealTimeTransactionStatus(transactionId: string): Promise<RealTimeTransaction | null> {
    // TODO: Implement real-time status tracking
    return null
  }
}

export default new PaymentsService()