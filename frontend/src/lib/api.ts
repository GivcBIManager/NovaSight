/**
 * API client utilities for NovaSight
 *
 * Re-exports the canonical apiClient from services/apiClient.ts.
 *
 * Previously this file maintained its own Axios instance with WRONG
 * token keys (`access_token` vs the correct `novasight_access_token`).
 * Now it delegates to the single, properly configured apiClient so
 * every consumer gets correct auth headers and 401-retry behaviour.
 */

import { apiClient } from '@/services/apiClient'
import type { ApiErrorDetail } from '@/types/api'

export { apiClient }

// Helper function to extract error message from backend error envelope
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    // Axios-shaped error
    const axiosErr = error as { response?: { data?: { error?: ApiErrorDetail; message?: string }; status?: number }; message?: string }
    if (axiosErr.response?.data?.error?.message) {
      return axiosErr.response.data.error.message
    }
    if (axiosErr.response?.data?.message) {
      return axiosErr.response.data.message
    }
    if (axiosErr.message) {
      return axiosErr.message
    }
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unknown error occurred'
}

export default apiClient
