import { io, Socket } from 'socket.io-client'
import { useTransactionStore } from '@/lib/stores/transaction-store'

class WebSocketService {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  connect(userId: string) {
    if (this.socket?.connected) return

    this.socket = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001', {
      auth: { userId },
      transports: ['websocket', 'polling'],
    })

    this.setupEventListeners()
  }

  private setupEventListeners() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      this.handleReconnect()
    })

    this.socket.on('transaction_update', (data) => {
      const { addTransaction, updateTransaction } = useTransactionStore.getState()
      if (data.type === 'new') {
        addTransaction(data.transaction)
      } else if (data.type === 'update') {
        updateTransaction(data.transaction.id, data.transaction)
      }
    })

    this.socket.on('notification', (notification) => {
      // Handle real-time notifications
      console.log('New notification:', notification)
      // Could integrate with a notification store here
    })

    this.socket.on('exchange_rate_update', (rates) => {
      // Handle real-time exchange rate updates
      console.log('Exchange rates updated:', rates)
      // Could update a rates store here
    })

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      this.handleReconnect()
    })
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
        this.socket?.connect()
      }, this.reconnectDelay * this.reconnectAttempts)
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    } else {
      console.warn('WebSocket not connected, cannot emit event:', event)
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }
}

export const wsService = new WebSocketService()