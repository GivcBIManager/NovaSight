/**
 * Query Page
 * Natural language query interface for ad-hoc analytics
 */

import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Send, Wand2, History, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { QueryResult } from '../components/QueryResult'
import { QueryHistory } from '../components/QueryHistory'
import { QuerySuggestions } from '../components/QuerySuggestions'
import { QueryLoadingState } from '../components/QueryLoadingState'
import { QueryError } from '../components/QueryError'
import { useQueryHistory } from '../hooks/useQueryHistory'
import api from '@/lib/api'
import type { QueryResult as QueryResultType } from '../types'

export function QueryPage() {
  const [query, setQuery] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const { addToHistory } = useQueryHistory()

  const queryMutation = useMutation({
    mutationFn: async (q: string) => {
      const response = await api.post<QueryResultType>('/assistant/query', { 
        query: q 
      })
      return response.data
    },
    onSuccess: (data, variables) => {
      // Add successful query to history
      addToHistory(variables, {
        row_count: data.data?.rows?.length || 0,
        query_type: data.intent?.query_type || 'unknown',
      })
    },
  })

  const handleSubmit = useCallback(() => {
    const trimmedQuery = query.trim()
    if (trimmedQuery) {
      queryMutation.mutate(trimmedQuery)
    }
  }, [query, queryMutation])

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuery(suggestion)
    queryMutation.mutate(suggestion)
  }, [queryMutation])

  const handleHistorySelect = useCallback((selectedQuery: string) => {
    setQuery(selectedQuery)
    setShowHistory(false)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Cmd/Ctrl + Enter
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  const handleRetry = useCallback(() => {
    if (query.trim()) {
      queryMutation.mutate(query.trim())
    }
  }, [query, queryMutation])

  return (
    <div className="container py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            Ask Your Data
          </h1>
          <p className="text-muted-foreground mt-1">
            Ask questions in natural language to explore your data
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowHistory(!showHistory)}
          className="gap-2"
        >
          <History className="h-4 w-4" />
          History
        </Button>
      </div>

      {/* Query Input */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="relative">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., What were the total sales by region last month?"
              className="min-h-[100px] pr-28 text-lg resize-none"
              disabled={queryMutation.isPending}
            />
            <div className="absolute right-2 bottom-2 flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  // Placeholder for AI-powered query enhancement
                }}
                disabled={!query.trim() || queryMutation.isPending}
                title="Enhance query with AI"
              >
                <Wand2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!query.trim() || queryMutation.isPending}
              >
                <Send className="h-4 w-4 mr-1.5" />
                {queryMutation.isPending ? 'Thinking...' : 'Ask'}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted rounded">
              {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
            </kbd> + <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted rounded">Enter</kbd> to submit
          </p>
        </CardContent>
      </Card>

      {/* Suggestions (show when no query result) */}
      {!queryMutation.data && !queryMutation.isPending && !queryMutation.error && (
        <QuerySuggestions onSelect={handleSuggestionClick} />
      )}

      {/* Loading State */}
      {queryMutation.isPending && <QueryLoadingState />}

      {/* Error State */}
      {queryMutation.error && !queryMutation.isPending && (
        <QueryError error={queryMutation.error} onRetry={handleRetry} />
      )}

      {/* Results */}
      {queryMutation.data && !queryMutation.isPending && (
        <QueryResult result={queryMutation.data} />
      )}

      {/* History Sidebar */}
      {showHistory && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => setShowHistory(false)}
          />
          <QueryHistory
            onSelect={handleHistorySelect}
            onClose={() => setShowHistory(false)}
          />
        </>
      )}
    </div>
  )
}
