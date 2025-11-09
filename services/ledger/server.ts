import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { LedgerService } from './index'
import { z } from 'zod'

const app = express()
const ledgerService = new LedgerService()
const PORT = process.env.PORT || 3003

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ledger', timestamp: new Date().toISOString() })
})

// Record transaction endpoint
app.post('/ledger/transactions', async (req, res) => {
  try {
    const schema = z.object({
      id: z.string(),
      fromUserId: z.string().optional(),
      toUserId: z.string().optional(),
      amount: z.string(), // Decimal as string
      currency: z.string(),
      type: z.enum(['send', 'receive', 'transfer', 'deposit', 'withdrawal']),
      description: z.string(),
      metadata: z.record(z.any()).optional()
    })

    const { amount, ...data } = schema.parse(req.body)
    const transactionData = {
      ...data,
      amount: new (await import('decimal.js')).Decimal(amount)
    }

    const entries = await ledgerService.recordTransaction(transactionData)
    res.json({ entries })
  } catch (error) {
    console.error('Record transaction error:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to record transaction' })
  }
})

// Get account balance endpoint
app.get('/ledger/balances/:userId/:currency', async (req, res) => {
  try {
    const { userId, currency } = req.params
    const balance = await ledgerService.getAccountBalance(userId, currency)

    if (!balance) {
      return res.status(404).json({ error: 'Balance not found' })
    }

    res.json({
      balance: {
        ...balance,
        available: balance.available.toString(),
        pending: balance.pending.toString(),
        frozen: balance.frozen.toString(),
        total: balance.total.toString()
      }
    })
  } catch (error) {
    console.error('Get balance error:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to get balance' })
  }
})

// Get balance history endpoint
app.get('/ledger/balances/:userId/:currency/history', async (req, res) => {
  try {
    const { userId, currency } = req.params
    const { startDate, endDate } = req.query

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate as string) : new Date()

    const history = await ledgerService.getBalanceHistory(userId, currency, start, end)

    res.json({
      history: history.map(entry => ({
        ...entry,
        amount: entry.amount.toString(),
        balanceBefore: entry.balanceBefore.toString(),
        balanceAfter: entry.balanceAfter.toString()
      }))
    })
  } catch (error) {
    console.error('Get balance history error:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to get balance history' })
  }
})

// Get transaction history endpoint
app.get('/ledger/transactions/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const { currency, startDate, endDate, type, limit = '50', offset = '0' } = req.query

    const filters = {
      currency: currency as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      type: type as string
    }

    const history = await ledgerService.getTransactionHistory(userId, filters)

    res.json({
      transactions: history.slice(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string)).map(entry => ({
        ...entry,
        amount: entry.amount.toString(),
        balanceBefore: entry.balanceBefore.toString(),
        balanceAfter: entry.balanceAfter.toString()
      })),
      total: history.length
    })
  } catch (error) {
    console.error('Get transaction history error:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to get transaction history' })
  }
})

// Reconciliation endpoint
app.post('/ledger/reconcile', async (req, res) => {
  try {
    const report = await ledgerService.reconcileBalances()
    res.json({
      report: {
        ...report,
        totalVolume: report.totalVolume.toString(),
        discrepancies: report.discrepancies.map(d => ({
          ...d,
          expectedAmount: d.expectedAmount.toString(),
          actualAmount: d.actualAmount.toString(),
          difference: d.difference.toString()
        }))
      }
    })
  } catch (error) {
    console.error('Reconciliation error:', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Reconciliation failed' })
  }
})

// Generate financial report endpoint
app.get('/ledger/reports/financial/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const { period = 'monthly' } = req.query

    const report = await ledgerService.generateFinancialReport(userId, period as 'daily' | 'weekly' | 'monthly')
    res.json({ report })
  } catch (error) {
    console.error('Generate report error:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to generate report' })
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
  console.log(`Ledger service listening on port ${PORT}`)
})
