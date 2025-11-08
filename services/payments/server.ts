import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { PaymentsService } from './index'
import { z } from 'zod'
import Decimal from 'decimal.js'

const app = express()
const paymentsService = new PaymentsService()
const PORT = process.env.PORT || 3002

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'payments', timestamp: new Date().toISOString() })
})

// Send money endpoint
app.post('/payments/send', async (req, res) => {
  try {
    const schema = z.object({
      fromUserId: z.string(),
      toUserId: z.string().optional(),
      toEmail: z.string().optional(),
      toPhone: z.string().optional(),
      amount: z.union([z.string(), z.number()]),
      currency: z.string(),
      description: z.string().optional(),
      paymentMethodId: z.string().optional(),
      priority: z.enum(['standard', 'express', 'instant']).optional()
    })

    const data = schema.parse(req.body)
    const request = {
      ...data,
      amount: new Decimal(data.amount)
    }

    const transaction = await paymentsService.sendMoney(request)
    res.json({
      transaction: {
        ...transaction,
        amount: transaction.amount.toString(),
        fee: transaction.fee.toString(),
        exchangeRate: transaction.exchangeRate?.toString()
      }
    })
  } catch (error) {
    console.error('Send money error:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : 'Send money failed' })
  }
})

// Receive money endpoint
app.post('/payments/receive/:transactionId', async (req, res) => {
  try {
    const schema = z.object({
      userId: z.string()
    })

    const { transactionId } = req.params
    const { userId } = schema.parse(req.body)

    const transaction = await paymentsService.receiveMoney(transactionId, userId)
    res.json({
      transaction: {
        ...transaction,
        amount: transaction.amount.toString(),
        fee: transaction.fee.toString()
      }
    })
  } catch (error) {
    console.error('Receive money error:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : 'Receive money failed' })
  }
})

// Request money endpoint
app.post('/payments/request', async (req, res) => {
  try {
    const schema = z.object({
      fromUserId: z.string(),
      toUserId: z.string(),
      amount: z.number(),
      description: z.string().optional()
    })

    const data = schema.parse(req.body)
    const transaction = await paymentsService.requestMoney(data.fromUserId, data.toUserId, data.amount, data.description)

    res.json({
      transaction: {
        ...transaction,
        amount: transaction.amount.toString(),
        fee: transaction.fee.toString()
      }
    })
  } catch (error) {
    console.error('Request money error:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : 'Request money failed' })
  }
})

// Add payment method endpoint
app.post('/payments/methods', async (req, res) => {
  try {
    const schema = z.object({
      userId: z.string(),
      type: z.enum(['bank_account', 'card', 'crypto_wallet']),
      provider: z.enum(['stripe', 'plaid', 'metamask', 'internal']),
      displayName: z.string(),
      last4: z.string(),
      isDefault: z.boolean().optional(),
      isVerified: z.boolean().optional(),
      metadata: z.record(z.any()).optional()
    })

    const data = schema.parse(req.body)
    const method = await paymentsService.addPaymentMethod(data.userId, { 
      ...data, 
      metadata: data.metadata || {}, 
      isDefault: data.isDefault || false,
      isVerified: data.isVerified || false,
      updatedAt: new Date() 
    })

    res.json({ method })
  } catch (error) {
    console.error('Add payment method error:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : 'Add payment method failed' })
  }
})

// Get payment methods endpoint
app.get('/payments/methods/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const methods = await paymentsService.getPaymentMethods(userId)
    res.json({ methods })
  } catch (error) {
    console.error('Get payment methods error:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : 'Get payment methods failed' })
  }
})

// Get user transactions endpoint
app.get('/payments/transactions/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const { limit = '50', offset = '0' } = req.query

    const transactions = await paymentsService.getUserTransactions(userId, parseInt(limit as string), parseInt(offset as string))

    res.json({
      transactions: transactions.map(tx => ({
        ...tx,
        amount: tx.amount.toString(),
        fee: tx.fee.toString()
      }))
    })
  } catch (error) {
    console.error('Get transactions error:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : 'Get transactions failed' })
  }
})

// Get transaction endpoint
app.get('/payments/transactions/detail/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params
    const transaction = await paymentsService.getTransaction(transactionId)

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' })
    }

    res.json({
      transaction: {
        ...transaction,
        amount: transaction.amount.toString(),
        fee: transaction.fee.toString()
      }
    })
  } catch (error) {
    console.error('Get transaction error:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : 'Get transaction failed' })
  }
})

// Process refund endpoint
app.post('/payments/refund/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params
    const { reason } = req.body

    const refundTransaction = await paymentsService.processRefund(transactionId, reason)

    res.json({
      refund: {
        ...refundTransaction,
        amount: refundTransaction.amount.toString(),
        fee: refundTransaction.fee.toString()
      }
    })
  } catch (error) {
    console.error('Process refund error:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : 'Process refund failed' })
  }
})

// Get real-time transaction status endpoint
app.get('/payments/transactions/:transactionId/status', async (req, res) => {
  try {
    const { transactionId } = req.params
    const status = await paymentsService.getRealTimeTransactionStatus(transactionId)

    if (!status) {
      return res.status(404).json({ error: 'Transaction status not found' })
    }

    res.json({ status })
  } catch (error) {
    console.error('Get transaction status error:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : 'Get transaction status failed' })
  }
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  paymentsService.shutdown().then(() => {
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  paymentsService.shutdown().then(() => {
    process.exit(0)
  })
})

app.listen(PORT, () => {
  console.log(`Payments service listening on port ${PORT}`)
})
