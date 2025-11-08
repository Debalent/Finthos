import { create } from 'zustand'

export interface Transaction {
  id: string
  amount: number
  currency: string
  type: 'send' | 'receive' | 'request'
  status: 'pending' | 'completed' | 'failed'
  recipient: string
  sender: string
  timestamp: Date
  description?: string
}

interface TransactionStore {
  transactions: Transaction[]
  isLoading: boolean
  error: string | null
  addTransaction: (transaction: Transaction) => void
  updateTransaction: (id: string, updates: Partial<Transaction>) => void
  setTransactions: (transactions: Transaction[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearTransactions: () => void
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  transactions: [],
  isLoading: false,
  error: null,
  addTransaction: (transaction: Transaction) =>
    set((state) => ({
      transactions: [transaction, ...state.transactions],
    })),
  updateTransaction: (id: string, updates: Partial<Transaction>) =>
    set((state) => ({
      transactions: state.transactions.map((tx) =>
        tx.id === id ? { ...tx, ...updates } : tx
      ),
    })),
  setTransactions: (transactions: Transaction[]) => set({ transactions }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error }),
  clearTransactions: () => set({ transactions: [] }),
}))
