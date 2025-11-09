'use client'

import { Suspense } from 'react'
import { LoadingState } from '@/components/loading-spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CurrencySelector } from '@/components/currency-selector'
import { ExportTools } from '@/components/export-tools'
import { SearchFilter } from '@/components/search-filter'
import { useState } from 'react'

// Sample data for demonstration
const sampleTransactions = [
  {
    id: '1',
    date: '2024-01-15',
    amount: 100.50,
    currency: 'USD',
    type: 'send',
    status: 'completed',
    description: 'Payment for services'
  },
  {
    id: '2',
    date: '2024-01-14',
    amount: 250.00,
    currency: 'EUR',
    type: 'receive',
    status: 'pending',
    description: 'Invoice payment'
  },
  {
    id: '3',
    date: '2024-01-13',
    amount: 75.25,
    currency: 'GBP',
    type: 'send',
    status: 'completed',
    description: 'Coffee shop'
  }
]

function DashboardContent() {
  const [selectedCurrency, setSelectedCurrency] = useState('USD')
  const [filteredTransactions, setFilteredTransactions] = useState(sampleTransactions)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Finthos Dashboard
          </h1>
          <p className="text-muted-foreground">
            Modern payment solutions with real-time features
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Currency Selector */}
          <div className="lg:col-span-1">
            <CurrencySelector
              selectedCurrency={selectedCurrency}
              onCurrencyChange={setSelectedCurrency}
              amount={100}
              showExchangeRate={true}
            />
          </div>

          {/* Export Tools */}
          <div className="lg:col-span-1">
            <ExportTools
              data={filteredTransactions}
              filename="Finthos-transactions"
              title="Transaction History"
            />
          </div>

          {/* Quick Stats */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Transactions</span>
                  <span className="font-medium">{filteredTransactions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Active Currency</span>
                  <span className="font-medium">{selectedCurrency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <span className="font-medium text-orange-600">
                    {filteredTransactions.filter(t => t.status === 'pending').length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-6">
          <SearchFilter
            data={sampleTransactions}
            onFilteredData={setFilteredTransactions}
            searchFields={['description', 'type', 'status']}
            filters={[
              {
                key: 'type',
                label: 'Transaction Type',
                type: 'select',
                options: ['send', 'receive', 'request']
              },
              {
                key: 'status',
                label: 'Status',
                type: 'select',
                options: ['pending', 'completed', 'failed']
              },
              {
                key: 'currency',
                label: 'Currency',
                type: 'select',
                options: ['USD', 'EUR', 'GBP']
              }
            ]}
            placeholder="Search transactions..."
          />
        </div>

        {/* Transaction List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        transaction.status === 'completed' ? 'bg-green-500' :
                        transaction.status === 'pending' ? 'bg-orange-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString()} • {transaction.type}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {transaction.amount} {transaction.currency}
                    </p>
                    <p className={`text-sm ${
                      transaction.status === 'completed' ? 'text-green-600' :
                      transaction.status === 'pending' ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {transaction.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingState message="Loading dashboard..." />}>
      <DashboardContent />
    </Suspense>
  )
}

