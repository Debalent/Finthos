const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const { createProxyMiddleware } = require('http-proxy-middleware')

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    services: {
      auth: process.env.AUTH_SERVICE_URL,
      payments: process.env.PAYMENTS_SERVICE_URL,
      ledger: process.env.LEDGER_SERVICE_URL
    }
  })
})

// Auth service proxy
app.use('/auth', createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  changeOrigin: true,
  pathRewrite: {
    '^/auth': ''
  }
}))

// Payments service proxy
app.use('/payments', createProxyMiddleware({
  target: process.env.PAYMENTS_SERVICE_URL || 'http://localhost:3002',
  changeOrigin: true,
  pathRewrite: {
    '^/payments': ''
  }
}))

// Ledger service proxy
app.use('/ledger', createProxyMiddleware({
  target: process.env.LEDGER_SERVICE_URL || 'http://localhost:3003',
  changeOrigin: true,
  pathRewrite: {
    '^/ledger': ''
  }
}))

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Error handler
app.use((error, req, res, next) => {
  console.error('API Gateway error:', error)
  res.status(500).json({ error: 'Internal server error' })
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
  console.log(`API Gateway listening on port ${PORT}`)
})
