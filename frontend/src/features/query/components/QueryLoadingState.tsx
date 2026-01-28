/**
 * Query Loading State Component
 * Displays an animated loading state while processing natural language query
 */

import { Card, CardContent } from '@/components/ui/card'

const LOADING_MESSAGES = [
  'Analyzing your question...',
  'Understanding context...',
  'Generating SQL query...',
  'Fetching data...',
]

export function QueryLoadingState() {
  return (
    <Card>
      <CardContent className="py-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="flex space-x-2">
            <div 
              className="w-3 h-3 bg-primary rounded-full animate-bounce" 
              style={{ animationDelay: '0ms' }}
            />
            <div 
              className="w-3 h-3 bg-primary rounded-full animate-bounce" 
              style={{ animationDelay: '150ms' }}
            />
            <div 
              className="w-3 h-3 bg-primary rounded-full animate-bounce" 
              style={{ animationDelay: '300ms' }}
            />
          </div>
          <p className="text-muted-foreground animate-pulse">
            {LOADING_MESSAGES[0]}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
