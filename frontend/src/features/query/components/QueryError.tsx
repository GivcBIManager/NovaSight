/**
 * Query Error Component
 * Displays user-friendly error messages for query failures
 */

import { AlertCircle, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface QueryErrorProps {
  error: Error | unknown
  onRetry?: () => void
}

export function QueryError({ error, onRetry }: QueryErrorProps) {
  const errorMessage = getErrorMessage(error)
  const errorType = getErrorType(error)

  return (
    <Card className="border-destructive/50">
      <CardContent className="py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{errorType}</AlertTitle>
          <AlertDescription className="mt-2">
            <p>{errorMessage}</p>
            {getSuggestion(error) && (
              <p className="mt-2 text-sm opacity-90">
                💡 {getSuggestion(error)}
              </p>
            )}
          </AlertDescription>
        </Alert>
        
        {onRetry && (
          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Check for axios error response
    const axiosError = error as any
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message
    }
    if (axiosError.response?.data?.error) {
      return axiosError.response.data.error
    }
    return error.message
  }
  return 'An unexpected error occurred while processing your query.'
}

function getErrorType(error: unknown): string {
  const axiosError = error as any
  const status = axiosError?.response?.status

  switch (status) {
    case 400:
      return 'Invalid Query'
    case 401:
      return 'Authentication Required'
    case 403:
      return 'Access Denied'
    case 404:
      return 'Resource Not Found'
    case 422:
      return 'Query Understanding Failed'
    case 429:
      return 'Rate Limited'
    case 500:
      return 'Server Error'
    case 503:
      return 'Service Unavailable'
    default:
      return 'Query Error'
  }
}

function getSuggestion(error: unknown): string | null {
  const axiosError = error as any
  const status = axiosError?.response?.status

  switch (status) {
    case 422:
      return 'Try rephrasing your question or be more specific about what data you want to see.'
    case 429:
      return 'You\'ve made too many requests. Please wait a moment and try again.'
    case 503:
      return 'The AI service might be temporarily unavailable. Please try again in a few moments.'
    default:
      return null
  }
}
