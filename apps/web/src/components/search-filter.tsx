'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Filter, X, Calendar, DollarSign } from 'lucide-react'

interface SearchableItem {
  id: string
  [key: string]: any
}

interface SearchFilterProps<T extends SearchableItem> {
  data: T[]
  onFilteredData: (filtered: T[]) => void
  searchFields?: (keyof T)[]
  filters?: {
    key: keyof T
    label: string
    type: 'text' | 'date' | 'number' | 'select'
    options?: string[]
  }[]
  placeholder?: string
}

export function SearchFilter<T extends SearchableItem>({
  data,
  onFilteredData,
  searchFields = ['id'],
  filters = [],
  placeholder = 'Search...'
}: SearchFilterProps<T>) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})
  const [showFilters, setShowFilters] = useState(false)

  const filteredData = useMemo(() => {
    let filtered = data

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(item =>
        searchFields.some(field => {
          const value = item[field]
          return value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        })
      )
    }

    // Apply filters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        filtered = filtered.filter(item => {
          const itemValue = item[key as keyof T]
          if (typeof itemValue === 'string' && typeof value === 'string') {
            return itemValue.toLowerCase().includes(value.toLowerCase())
          }
          return itemValue === value
        })
      }
    })

    return filtered
  }, [data, searchTerm, activeFilters, searchFields])

  // Update parent component with filtered data
  useMemo(() => {
    onFilteredData(filteredData)
  }, [filteredData, onFilteredData])

  const handleFilterChange = (key: string, value: any) => {
    setActiveFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilter = (key: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev }
      delete newFilters[key]
      return newFilters
    })
  }

  const clearAllFilters = () => {
    setSearchTerm('')
    setActiveFilters({})
  }

  const activeFilterCount = Object.keys(activeFilters).length + (searchTerm ? 1 : 0)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </span>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear ({activeFilterCount})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {showFilters && filters.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/50">
            {filters.map((filter) => (
              <div key={filter.key as string} className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  {filter.type === 'date' && <Calendar className="h-3 w-3" />}
                  {filter.type === 'number' && <DollarSign className="h-3 w-3" />}
                  {filter.label}
                </label>

                {filter.type === 'select' && filter.options ? (
                  <select
                    value={activeFilters[filter.key as string] || ''}
                    onChange={(e) => handleFilterChange(filter.key as string, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
                    title={filter.label}
                  >
                    <option value="">All</option>
                    {filter.options.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type={filter.type}
                    placeholder={`Filter by ${filter.label.toLowerCase()}`}
                    value={activeFilters[filter.key as string] || ''}
                    onChange={(e) => handleFilterChange(filter.key as string, e.target.value)}
                    className="text-sm"
                  />
                )}

                {activeFilters[filter.key as string] && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearFilter(filter.key as string)}
                    className="h-6 px-2 text-xs"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          Showing {filteredData.length} of {data.length} items
        </div>
      </CardContent>
    </Card>
  )
}