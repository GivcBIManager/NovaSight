/**
 * Results Table Component
 * Displays SQL query results in a paginated table
 */

import { useState, useMemo } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ChevronDown, ChevronUp, ChevronsUpDown, Download, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { SqlQueryResult } from '../types'

interface ResultsTableProps {
  result: SqlQueryResult
  className?: string
}

export function ResultsTable({ result, className }: ResultsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [copied, setCopied] = useState(false)

  // Build columns from result
  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    return result.columns.map((col) => ({
      accessorKey: col.name,
      header: ({ column }) => {
        const sorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
            onClick={() => column.toggleSorting(sorted === 'asc')}
          >
            <span className="font-medium">{col.name}</span>
            <span className="ml-1 text-xs text-muted-foreground">({col.type})</span>
            {sorted === 'asc' ? (
              <ChevronUp className="ml-1 h-4 w-4" />
            ) : sorted === 'desc' ? (
              <ChevronDown className="ml-1 h-4 w-4" />
            ) : (
              <ChevronsUpDown className="ml-1 h-4 w-4 opacity-50" />
            )}
          </Button>
        )
      },
      cell: ({ getValue }) => {
        const value = getValue()
        if (value === null) {
          return <span className="text-muted-foreground italic">NULL</span>
        }
        if (typeof value === 'boolean') {
          return <span>{value ? 'true' : 'false'}</span>
        }
        if (typeof value === 'object') {
          return <span className="font-mono text-xs">{JSON.stringify(value)}</span>
        }
        return <span className="max-w-[300px] truncate block">{String(value)}</span>
      },
    }))
  }, [result.columns])

  const table = useReactTable({
    data: result.rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 25 },
    },
  })

  const handleExportCSV = () => {
    const headers = result.columns.map((c) => c.name).join(',')
    const rows = result.rows.map((row) =>
      result.columns
        .map((col) => {
          const val = row[col.name]
          if (val === null) return ''
          if (typeof val === 'string' && val.includes(',')) return `"${val}"`
          return String(val)
        })
        .join(',')
    )
    const csv = [headers, ...rows].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query_results_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyJSON = async () => {
    const json = JSON.stringify(result.rows, null, 2)
    await navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="text-sm text-muted-foreground">
          {result.rowCount.toLocaleString()} rows
          {result.truncated && (
            <span className="text-yellow-600 ml-2">(truncated)</span>
          )}
          <span className="mx-2">•</span>
          {result.executionTimeMs}ms
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleCopyJSON} className="gap-1.5">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy JSON'}
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportCSV} className="gap-1.5">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="font-mono text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page</span>
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
