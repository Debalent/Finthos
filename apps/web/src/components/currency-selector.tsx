'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, DollarSign, Euro, PoundSterling, Yen } from 'lucide-react'

const currencies = [
  { code: 'USD', name: 'US Dollar', symbol: '$', icon: DollarSign },
  { code: 'EUR', name: 'Euro', symbol: '€', icon: Euro },
  { code: 'GBP', name: 'British Pound', symbol: '£', icon: PoundSterling },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', icon: Yen },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', icon: DollarSign },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', icon: DollarSign },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', icon: null },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', icon: Yen },
]

interface CurrencySelectorProps {
  selectedCurrency: string
  onCurrencyChange: (currency: string) => void
  amount?: number
  showExchangeRate?: boolean
}

export function CurrencySelector({
  selectedCurrency,
  onCurrencyChange,
  amount,
  showExchangeRate = true
}: CurrencySelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [exchangeRates] = useState({
    USD: 1,
    EUR: 0.85,
    GBP: 0.73,
    JPY: 110.0,
    CAD: 1.25,
    AUD: 1.35,
    CHF: 0.92,
    CNY: 6.45,
  })

  const filteredCurrencies = currencies.filter(currency =>
    currency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    currency.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedCurrencyData = currencies.find(c => c.code === selectedCurrency)

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Select Currency
          {selectedCurrencyData && (
            <span className="text-sm font-normal text-muted-foreground">
              ({selectedCurrencyData.symbol})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search currencies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
          {filteredCurrencies.map((currency) => {
            const Icon = currency.icon
            const isSelected = selectedCurrency === currency.code
            const rate = exchangeRates[currency.code as keyof typeof exchangeRates] || 1

            return (
              <Button
                key={currency.code}
                variant={isSelected ? "default" : "outline"}
                className="h-auto p-3 flex flex-col items-start gap-1"
                onClick={() => onCurrencyChange(currency.code)}
              >
                <div className="flex items-center gap-2 w-full">
                  {Icon && <Icon className="h-4 w-4" />}
                  <span className="font-medium">{currency.code}</span>
                  <span className="text-sm text-muted-foreground ml-auto">
                    {currency.symbol}
                  </span>
                </div>
                <span className="text-xs text-left text-muted-foreground">
                  {currency.name}
                </span>
                {showExchangeRate && amount && (
                  <span className="text-xs text-left">
                    {(amount * rate).toFixed(2)} {currency.symbol}
                  </span>
                )}
              </Button>
            )
          })}
        </div>

        {amount && showExchangeRate && (
          <div className="text-sm text-muted-foreground text-center pt-2 border-t">
            Converting {amount} USD
          </div>
        )}
      </CardContent>
    </Card>
  )
}
