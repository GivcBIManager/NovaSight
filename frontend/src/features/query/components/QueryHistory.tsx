/**
 * Query History Sidebar Component
 * Shows previous queries with ability to re-run or delete
 */

import { formatDistanceToNow } from 'date-fns'
import { X, Trash2, Clock, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useQueryHistory } from '../hooks/useQueryHistory'
import type { QueryHistoryItem } from '../types'

interface QueryHistoryProps {
  onSelect: (query: string) => void
  onClose: () => void
}

export function QueryHistory({ onSelect, onClose }: QueryHistoryProps) {
  const { history, isLoading, deleteQuery, clearHistory, isDeleting } = useQueryHistory()

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-background border-l shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          <h2 className="font-semibold">Query History</h2>
        </div>
        <div className="flex items-center gap-1">
          {history.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive">
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all history?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your query history. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => clearHistory()}>
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No queries yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Your query history will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {history.map((item) => (
              <HistoryItem
                key={item.id}
                item={item}
                onSelect={onSelect}
                onDelete={deleteQuery}
                isDeleting={isDeleting}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

interface HistoryItemProps {
  item: QueryHistoryItem
  onSelect: (query: string) => void
  onDelete: (id: string) => void
  isDeleting: boolean
}

function HistoryItem({ item, onSelect, onDelete, isDeleting }: HistoryItemProps) {
  const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true })

  return (
    <div className="group p-4 hover:bg-muted/50 transition-colors">
      <button
        className="w-full text-left"
        onClick={() => onSelect(item.query)}
      >
        <p className="text-sm line-clamp-2 mb-2">{item.query}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
          {item.result_summary && (
            <span className="text-xs text-muted-foreground">
              {item.result_summary.row_count} rows
            </span>
          )}
        </div>
      </button>
      
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
        onClick={(e) => {
          e.stopPropagation()
          onDelete(item.id)
        }}
        disabled={isDeleting}
      >
        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
      </Button>
    </div>
  )
}
