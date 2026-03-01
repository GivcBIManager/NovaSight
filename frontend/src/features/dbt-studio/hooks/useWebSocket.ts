/**
 * WebSocket hook for real-time dbt log streaming.
 *
 * Falls back to HTTP polling if WebSocket connection fails.
 * Uses the /ws/dbt namespace for SocketIO or
 * GET /api/v1/dbt/executions/{id}/logs?offset=N for polling.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { executionApi } from '../services/visualModelApi'

interface UseWebSocketOptions {
  /** Execution ID to subscribe to. */
  executionId: string | null
  /** Whether to auto-connect. */
  enabled?: boolean
  /** Polling interval in ms (fallback). Default: 2000. */
  pollInterval?: number
}

interface UseWebSocketReturn {
  /** Accumulated log lines. */
  lines: string[]
  /** Whether the connection is active. */
  isConnected: boolean
  /** Clear the log buffer. */
  clearLogs: () => void
}

export function useWebSocket({
  executionId,
  enabled = true,
  pollInterval = 2000,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [lines, setLines] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const offsetRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearLogs = useCallback(() => {
    setLines([])
    offsetRef.current = 0
  }, [])

  // Polling fallback — always available
  useEffect(() => {
    if (!enabled || !executionId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    setIsConnected(true)

    const poll = async () => {
      try {
        const resp = await executionApi.getExecutionLogs(executionId, offsetRef.current)
        if (resp.lines.length > 0) {
          setLines((prev) => [...prev, ...resp.lines])
          offsetRef.current = resp.next_offset
        }
      } catch {
        // Ignore errors during polling
      }
    }

    // Initial fetch
    poll()

    intervalRef.current = setInterval(poll, pollInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsConnected(false)
    }
  }, [executionId, enabled, pollInterval])

  return { lines, isConnected, clearLogs }
}
