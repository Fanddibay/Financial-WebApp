import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Transaction } from '@/types/transaction'
import { formatIDR } from './currency'

/** Escape CSV cell (quotes, newlines) */
function escapeCsvCell(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/**
 * Export transactions to CSV
 */
export function exportToCSV(
  transactions: Transaction[],
  options?: { includePocket?: boolean; pocketNames?: Record<string, string> },
  filename = 'transactions.csv',
) {
  const includePocket = options?.includePocket ?? false
  const pocketNames = options?.pocketNames ?? {}
  const headers = ['Date', 'Type', 'Description', 'Category', 'Amount', 'Amount (IDR)']
  if (includePocket) headers.splice(2, 0, 'Pocket')

  const rows = transactions.map((t) => {
    const type = t.type === 'transfer' ? 'Transfer' : t.type === 'income' ? 'Income' : 'Expense'
    const base = [
      new Date(t.date).toLocaleDateString('id-ID'),
      type,
      t.description,
      t.category,
      String(t.amount),
      formatIDR(t.amount),
    ]
    if (includePocket) {
      const name = pocketNames[t.pocketId] ?? t.pocketId
      base.splice(2, 0, name)
    }
    return base.map((c) => escapeCsvCell(String(c)))
  })

  const csv = [headers.map(escapeCsvCell).join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Export transactions to Excel (XLSX)
 */
export function exportToXLSX(transactions: Transaction[], filename = 'transactions.xlsx') {
  // Prepare data for Excel
  const data = transactions.map((t) => {
    const type = t.type === 'transfer' ? 'Transfer' : t.type === 'income' ? 'Income' : 'Expense'
    return {
      Date: new Date(t.date).toLocaleDateString('id-ID'),
      Type: type,
      Description: t.description,
      Category: t.category,
      Amount: t.amount,
      'Amount (IDR)': formatIDR(t.amount),
    }
  })

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)

  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, // Date
    { wch: 10 }, // Type
    { wch: 30 }, // Description
    { wch: 15 }, // Category
    { wch: 15 }, // Amount
    { wch: 20 }, // Amount (IDR)
  ]

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions')

  // Write file
  XLSX.writeFile(wb, filename)
}

/**
 * Export transactions to PDF
 */
export function exportToPDF(transactions: Transaction[], summary?: {
  totalIncome: number
  totalExpenses: number
  balance: number
}, filename = 'transactions.pdf') {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(18)
  doc.text('Financial Transactions Report', 14, 20)

  // Summary section
  if (summary) {
    doc.setFontSize(12)
    doc.text('Summary', 14, 35)
    doc.setFontSize(10)
    doc.text(`Total Income: ${formatIDR(summary.totalIncome)}`, 14, 42)
    doc.text(`Total Expenses: ${formatIDR(summary.totalExpenses)}`, 14, 49)
    doc.text(`Balance: ${formatIDR(summary.balance)}`, 14, 56)
  }

  // Prepare table data
  const tableData = transactions.map((t) => {
    const type = t.type === 'transfer' ? 'Transfer' : t.type === 'income' ? 'Income' : 'Expense'
    return [
      new Date(t.date).toLocaleDateString('id-ID'),
      type,
      t.description,
      t.category,
      formatIDR(t.amount),
    ]
  })

  // Add table
  autoTable(doc, {
    startY: summary ? 62 : 30,
    head: [['Date', 'Type', 'Description', 'Category', 'Amount']],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [66, 184, 131], // Brand color
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 25 },
      2: { cellWidth: 60 },
      3: { cellWidth: 30 },
      4: { cellWidth: 35, halign: 'right' },
    },
  })

  // Save PDF
  doc.save(filename)
}

/**
 * Export summary to PDF
 */
export function exportSummaryToPDF(summary: {
  totalIncome: number
  totalExpenses: number
  balance: number
  incomeCount: number
  expenseCount: number
}, filename = 'financial-summary.pdf') {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(18)
  doc.text('Financial Summary Report', 14, 20)

  // Summary details
  doc.setFontSize(12)
  doc.text('Financial Overview', 14, 35)

  doc.setFontSize(10)
  let yPos = 42

  doc.text(`Total Income: ${formatIDR(summary.totalIncome)}`, 14, yPos)
  yPos += 7
  doc.text(`Income Transactions: ${summary.incomeCount}`, 14, yPos)
  yPos += 10

  doc.text(`Total Expenses: ${formatIDR(summary.totalExpenses)}`, 14, yPos)
  yPos += 7
  doc.text(`Expense Transactions: ${summary.expenseCount}`, 14, yPos)
  yPos += 10

  doc.setFontSize(12)
  doc.text(`Net Balance: ${formatIDR(summary.balance)}`, 14, yPos)

  // Add date
  yPos += 15
  doc.setFontSize(8)
  doc.text(`Generated on: ${new Date().toLocaleString('id-ID')}`, 14, yPos)

  // Save PDF
  doc.save(filename)
}

