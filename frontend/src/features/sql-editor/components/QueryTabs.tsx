/**
 * Query Tabs Component
 * Manages multiple query tabs in the SQL editor
 */

import { useState } from 'react'
import { Plus, X, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { QueryTab } from '../types'

interface QueryTabsProps {
  tabs: QueryTab[]
  activeTabId: string
  onTabChange: (tabId: string) => void
  onTabClose: (tabId: string) => void
  onNewTab: () => void
  onTabRename?: (tabId: string, name: string) => void
}

export function QueryTabs({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onNewTab,
  onTabRename,
}: QueryTabsProps) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleDoubleClick = (tab: QueryTab) => {
    if (onTabRename) {
      setEditingTabId(tab.id)
      setEditName(tab.name)
    }
  }

  const handleRenameSubmit = (tabId: string) => {
    if (editName.trim() && onTabRename) {
      onTabRename(tabId, editName.trim())
    }
    setEditingTabId(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent, tabId: string) => {
    if (e.key === 'Enter') {
      handleRenameSubmit(tabId)
    } else if (e.key === 'Escape') {
      setEditingTabId(null)
    }
  }

  return (
    <div className="flex items-center border-b bg-muted/30 overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            'group flex items-center gap-1 px-3 py-2 border-r cursor-pointer min-w-[120px] max-w-[200px]',
            'hover:bg-accent/50 transition-colors',
            activeTabId === tab.id && 'bg-background border-b-2 border-b-primary'
          )}
          onClick={() => onTabChange(tab.id)}
          onDoubleClick={() => handleDoubleClick(tab)}
        >
          {/* Dirty indicator */}
          {tab.isDirty && (
            <Circle className="h-2 w-2 fill-current text-blue-500 flex-shrink-0" />
          )}

          {/* Tab name */}
          {editingTabId === tab.id ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => handleRenameSubmit(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, tab.id)}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-transparent outline-none text-sm border-b border-primary"
              autoFocus
            />
          ) : (
            <span className="flex-1 truncate text-sm">{tab.name}</span>
          )}

          {/* Executing indicator */}
          {tab.isExecuting && (
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}

          {/* Close button */}
          {tabs.length > 1 && (
            <button
              className={cn(
                'p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted',
                'transition-opacity'
              )}
              onClick={(e) => {
                e.stopPropagation()
                onTabClose(tab.id)
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}

      {/* New tab button */}
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 mx-1 flex-shrink-0"
        onClick={onNewTab}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  )
}
