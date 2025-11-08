'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, FileText, FileSpreadsheet, Printer } from 'lucide-react'
import jsPDF from 'jspdf'
import { utils, writeFile } from 'xlsx'

interface ExportData {
  id: string
  date: string
  amount: number
  currency: string
  type: string
  status: string
  description?: string
}

interface ExportToolsProps {
  data: ExportData[]
  filename?: string
  title?: string
}

export function ExportTools({ data, filename = 'export', title = 'Data Export' }: ExportToolsProps) {
  const [isExporting, setIsExporting] = useState(false)

  const exportToPDF = async () => {
    setIsExporting(true)
    try {
      const doc = new jsPDF()

      // Add title
      doc.setFontSize(20)
      doc.text(title, 20, 30)

      // Add timestamp
      doc.setFontSize(10)
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 45)

      // Add table headers
      const headers = ['Date', 'Amount', 'Currency', 'Type', 'Status', 'Description']
      let yPosition = 60

      doc.setFontSize(12)
      headers.forEach((header, index) => {
        doc.text(header, 20 + (index * 30), yPosition)
      })

      yPosition += 10

      // Add data rows
      doc.setFontSize(10)
      data.forEach((item) => {
        const row = [
          new Date(item.date).toLocaleDateString(),
          item.amount.toString(),
          item.currency,
          item.type,
          item.status,
          item.description || ''
        ]

        row.forEach((cell, index) => {
          doc.text(cell, 20 + (index * 30), yPosition)
        })

        yPosition += 8

        // Add new page if needed
        if (yPosition > 270) {
          doc.addPage()
          yPosition = 30
        }
      })

      doc.save(`${filename}.pdf`)
    } catch (error) {
      console.error('PDF export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const exportToCSV = () => {
    setIsExporting(true)
    try {
      const csvData = data.map(item => ({
        Date: new Date(item.date).toLocaleDateString(),
        Amount: item.amount,
        Currency: item.currency,
        Type: item.type,
        Status: item.status,
        Description: item.description || ''
      }))

      const ws = utils.json_to_sheet(csvData)
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'Data')
      writeFile(wb, `${filename}.xlsx`)
    } catch (error) {
      console.error('CSV export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const exportToJSON = () => {
    setIsExporting(true)
    try {
      const jsonData = {
        title,
        generatedAt: new Date().toISOString(),
        data: data.map(item => ({
          ...item,
          date: new Date(item.date).toISOString()
        }))
      }

      const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('JSON export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const printData = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .header { margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${title}</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Currency</th>
                <th>Type</th>
                <th>Status</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(item => `
                <tr>
                  <td>${new Date(item.date).toLocaleDateString()}</td>
                  <td>${item.amount}</td>
                  <td>${item.currency}</td>
                  <td>${item.type}</td>
                  <td>${item.status}</td>
                  <td>${item.description || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          onClick={exportToPDF}
          disabled={isExporting}
          className="w-full justify-start"
          variant="outline"
        >
          <FileText className="h-4 w-4 mr-2" />
          Export as PDF
        </Button>

        <Button
          onClick={exportToCSV}
          disabled={isExporting}
          className="w-full justify-start"
          variant="outline"
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as Excel
        </Button>

        <Button
          onClick={exportToJSON}
          disabled={isExporting}
          className="w-full justify-start"
          variant="outline"
        >
          <Download className="h-4 w-4 mr-2" />
          Export as JSON
        </Button>

        <Button
          onClick={printData}
          className="w-full justify-start"
          variant="outline"
        >
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </CardContent>
    </Card>
  )
}
