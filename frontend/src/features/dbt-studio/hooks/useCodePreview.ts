/**
 * Hook for previewing generated dbt code.
 *
 * Wraps the preview API call with a manual trigger
 * (not auto-fetched on mount).
 */

import { useMutation } from '@tanstack/react-query'
import { visualModelApi } from '../services/visualModelApi'
import type { GeneratedCodePreview } from '../types/visualModel'

export function useCodePreviewMutation() {
  return useMutation<GeneratedCodePreview, Error, string>({
    mutationFn: (modelId: string) => visualModelApi.previewCode(modelId),
  })
}
