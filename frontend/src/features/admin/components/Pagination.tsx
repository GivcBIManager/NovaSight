/**
 * Pagination Component
 * 
 * Reusable pagination component for admin tables
 */

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number | undefined
  onPageChange: (page: number) => void
  showFirstLast?: boolean
}

export function Pagination({ 
  page, 
  totalPages = 1, 
  onPageChange,
  showFirstLast = true 
}: PaginationProps) {
  const canGoPrev = page > 1
  const canGoNext = page < totalPages

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const maxVisible = 5
    
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    
    // Always show first page
    pages.push(1)
    
    // Calculate range around current page
    let start = Math.max(2, page - 1)
    let end = Math.min(totalPages - 1, page + 1)
    
    // Adjust if at edges
    if (page <= 3) {
      end = Math.min(4, totalPages - 1)
    }
    if (page >= totalPages - 2) {
      start = Math.max(2, totalPages - 3)
    }
    
    // Add ellipsis if needed
    if (start > 2) {
      pages.push('ellipsis')
    }
    
    // Add middle pages
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    
    // Add ellipsis if needed
    if (end < totalPages - 1) {
      pages.push('ellipsis')
    }
    
    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages)
    }
    
    return pages
  }

  return (
    <div className="flex items-center justify-between px-2">
      <div className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </div>
      
      <div className="flex items-center space-x-1">
        {showFirstLast && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={!canGoPrev}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!canGoPrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center space-x-1">
          {getPageNumbers().map((pageNum, idx) => 
            pageNum === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                ...
              </span>
            ) : (
              <Button
                key={pageNum}
                variant={pageNum === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                className="min-w-[2rem]"
              >
                {pageNum}
              </Button>
            )
          )}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!canGoNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        {showFirstLast && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={!canGoNext}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
