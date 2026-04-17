/**
 * Saved-Query hooks scoped to dbt Studio.
 *
 * Thin wrapper around the shared SQL-Editor saved-queries hook that
 * defaults the `query_type` filter to `'dbt'` so dbt Studio surfaces
 * only saved queries intended for modeling.
 *
 * Used by:
 *  - VisualQueryBuilder (load saved SQL as the staging source)
 *  - TestConfigForm (load saved SQL as a singular test body)
 */

import { useSavedQueries, useCreateSavedQuery } from '@/features/sql-editor/hooks/useSavedQueries'
import type { SavedQuery } from '@/features/sql-editor/types'

export type DbtQueryType = 'dbt' | 'adhoc' | 'pyspark' | 'report'

export interface UseDbtSavedQueriesOptions {
  /**
   * Which `query_type` values to include. Defaults to `['dbt','adhoc']`
   * so analysts can also promote ad-hoc explorations into dbt models.
   */
  includeTypes?: DbtQueryType[]
}

/**
 * Returns saved queries filtered to types relevant for dbt authoring.
 * The backend filter API supports a single `query_type`; we fan-out
 * client-side by listing all and filtering in memory — the list is
 * already tenant-scoped and bounded.
 */
export function useDbtSavedQueries(options: UseDbtSavedQueriesOptions = {}) {
  const includeTypes = options.includeTypes ?? ['dbt', 'adhoc']
  const query = useSavedQueries()

  const items: SavedQuery[] = (query.data?.items ?? []).filter((q) =>
    includeTypes.includes(q.query_type as DbtQueryType)
  )

  return {
    ...query,
    items,
  }
}

export { useCreateSavedQuery }
export type { SavedQuery }
