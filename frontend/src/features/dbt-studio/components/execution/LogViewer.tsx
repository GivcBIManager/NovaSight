/**
 * LogViewer — real-time dbt log stream viewer.
 *
 * Uses polling-based log fetching to display dbt command output.
 * Auto-scrolls to bottom, supports ANSI color stripping, and
 * shows connection status.
 */

import { useRef, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Terminal,
  ArrowDown,
  Trash2,
  Search,
  Download,
  Pause,
  Play,
} from 'lucide-react'
import { useWebSocket } from '../../hooks/useWebSocket'

export interface LogViewerProps {
  executionId?: string
  /** Static log content (for completed executions). */
  staticLog?: string
  maxHeight?: string
}

function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '')
}

function colorize(line: string): { text: string; className: string } {
  const clean = stripAnsi(line)
  if (clean.includes('ERROR') || clean.includes('[error]'))
    return { text: clean, className: 'text-red-400' }
  if (clean.includes('WARNING') || clean.includes('[warn]'))
    return { text: clean, className: 'text-yellow-400' }
  if (clean.includes('OK') || clean.includes('PASS') || clean.includes('SUCCESS'))
    return { text: clean, className: 'text-green-400' }
  if (clean.includes('SKIP'))
    return { text: clean, className: 'text-gray-500' }
  if (clean.startsWith('Running') || clean.includes('Completed'))
    return { text: clean, className: 'text-blue-400' }
  return { text: clean, className: 'text-slate-300' }
}

export function LogViewer({
  executionId,
  staticLog,
  maxHeight = '400px',
}: LogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [filter, setFilter] = useState('')
  const [paused, setPaused] = useState(false)

  const { lines: wsLines, isConnected, clearLogs } = useWebSocket({
    executionId: executionId ?? null,
    enabled: !!executionId && !staticLog && !paused,
    pollInterval: 2000,
  })

  const rawLines = staticLog
    ? staticLog.split('\n')
    : wsLines

  const lines = filter
    ? rawLines.filter((l) => l.toLowerCase().includes(filter.toLowerCase()))
    : rawLines

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [lines.length, autoScroll])

  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const atBottom = scrollHeight - scrollTop - clientHeight < 40
    setAutoScroll(atBottom)
  }

  const downloadLog = () => {
    const blob = new Blob([rawLines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dbt-log-${executionId || 'static'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Log Output
            {executionId && (
              <Badge variant="outline" className="text-[10px]">
                #{executionId}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            {!staticLog && executionId && (
              <Badge
                variant={isConnected ? 'default' : 'secondary'}
                className="text-[10px]"
              >
                {isConnected ? 'Live' : 'Disconnected'}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Toolbar */}
        <div className="flex items-center gap-1">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter logs..."
              className="pl-7 h-7 text-xs"
            />
          </div>
          {!staticLog && executionId && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPaused(!paused)}
              title={paused ? 'Resume' : 'Pause'}
            >
              {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setAutoScroll(true)}
            title="Scroll to bottom"
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={downloadLog}
            title="Download log"
          >
            <Download className="h-3 w-3" />
          </Button>
          {!staticLog && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={clearLogs}
              title="Clear"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Log content */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="bg-slate-950 rounded-md p-3 overflow-y-auto font-mono text-xs leading-5"
          style={{ maxHeight }}
        >
          {lines.length === 0 ? (
            <span className="text-slate-500">
              {executionId
                ? 'Waiting for log output...'
                : 'No log data available.'}
            </span>
          ) : (
            lines.map((line, idx) => {
              const { text, className } = colorize(line)
              return (
                <div key={idx} className={`whitespace-pre-wrap ${className}`}>
                  <span className="text-slate-600 select-none mr-2">
                    {String(idx + 1).padStart(4)}
                  </span>
                  {text}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{lines.length} lines</span>
          {!autoScroll && (
            <span className="text-yellow-500">Auto-scroll paused (scroll down to resume)</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
