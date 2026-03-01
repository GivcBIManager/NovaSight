/**
 * TestResultsTable — displays dbt test run results.
 *
 * Shows each test's status (pass/fail/warn/error) with details
 * and execution metadata.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CheckCircle, XCircle, AlertTriangle, Clock, FlaskConical } from 'lucide-react'

export interface TestResult {
  test_name: string
  status: 'pass' | 'fail' | 'warn' | 'error' | 'skipped'
  model_name?: string
  column_name?: string
  execution_time?: number
  failures?: number
  message?: string
}

export interface TestResultsTableProps {
  results: TestResult[]
  isLoading?: boolean
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pass: <CheckCircle className="h-3.5 w-3.5 text-green-500" />,
  fail: <XCircle className="h-3.5 w-3.5 text-red-500" />,
  warn: <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />,
  error: <XCircle className="h-3.5 w-3.5 text-red-600" />,
  skipped: <Clock className="h-3.5 w-3.5 text-gray-400" />,
}

const STATUS_COLORS: Record<string, string> = {
  pass: 'bg-green-50 text-green-700 border-green-200',
  fail: 'bg-red-50 text-red-700 border-red-200',
  warn: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  error: 'bg-red-100 text-red-800 border-red-300',
  skipped: 'bg-gray-50 text-gray-500 border-gray-200',
}

export function TestResultsTable({ results, isLoading }: TestResultsTableProps) {
  const summary = {
    total: results.length,
    pass: results.filter((r) => r.status === 'pass').length,
    fail: results.filter((r) => r.status === 'fail').length,
    warn: results.filter((r) => r.status === 'warn').length,
    error: results.filter((r) => r.status === 'error').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FlaskConical className="h-4 w-4" />
          Test Results
          <Badge variant="secondary" className="ml-auto text-[10px]">
            {summary.total} tests
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary badges */}
        <div className="flex gap-2 mb-3">
          {summary.pass > 0 && (
            <Badge variant="outline" className="text-green-700 border-green-300 text-[10px]">
              {summary.pass} passed
            </Badge>
          )}
          {summary.fail > 0 && (
            <Badge variant="outline" className="text-red-700 border-red-300 text-[10px]">
              {summary.fail} failed
            </Badge>
          )}
          {summary.warn > 0 && (
            <Badge variant="outline" className="text-yellow-700 border-yellow-300 text-[10px]">
              {summary.warn} warnings
            </Badge>
          )}
          {summary.error > 0 && (
            <Badge variant="outline" className="text-red-800 border-red-400 text-[10px]">
              {summary.error} errors
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 animate-spin mr-2" />
            Running tests...
          </div>
        ) : results.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            No test results yet. Run dbt test to see results.
          </p>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead className="text-xs">Test</TableHead>
                  <TableHead className="text-xs">Model</TableHead>
                  <TableHead className="text-xs">Column</TableHead>
                  <TableHead className="text-xs text-right">Time</TableHead>
                  <TableHead className="text-xs text-right">Failures</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result, idx) => (
                  <TableRow key={idx} className={result.status === 'fail' ? 'bg-red-50/50' : ''}>
                    <TableCell className="py-1.5">
                      {STATUS_ICONS[result.status]}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="space-y-0.5">
                        <span className="text-xs font-mono block">{result.test_name}</span>
                        {result.message && (
                          <span className="text-[10px] text-muted-foreground block truncate max-w-xs">
                            {result.message}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="text-xs font-mono">{result.model_name || '—'}</span>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="text-xs font-mono">{result.column_name || '—'}</span>
                    </TableCell>
                    <TableCell className="py-1.5 text-right">
                      <span className="text-xs tabular-nums">
                        {result.execution_time != null
                          ? `${result.execution_time.toFixed(2)}s`
                          : '—'}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5 text-right">
                      {result.failures != null ? (
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${STATUS_COLORS[result.status]}`}
                        >
                          {result.failures}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
