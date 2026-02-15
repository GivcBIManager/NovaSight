import { apiClient } from './apiClient'
import type {
  DataSource,
  DataSourceCreate,
  DataSourceUpdate,
  ConnectionTestRequest,
  ConnectionTestResult,
  DataSourceSchema,
  SyncConfig,
  SyncJob,
} from '@/types/datasource'
import type { PaginatedResponse, PaginationMeta } from '@/types/api'

const BASE_PATH = '/api/v1/connections'

export const dataSourceService = {
  /**
   * Get all data sources.
   * Backend returns { connections: [...], pagination: {...} }.
   * We normalise into PaginatedResponse<DataSource>.
   */
  async getAll(params?: {
    page?: number
    per_page?: number
    db_type?: string
    status?: string
  }): Promise<PaginatedResponse<DataSource>> {
    const response = await apiClient.get<{
      connections: DataSource[]
      pagination: PaginationMeta
    }>(BASE_PATH, { params })
    const { connections, pagination } = response.data
    return {
      items: connections,
      pagination,
      total: pagination.total,
      page: pagination.page,
      per_page: pagination.per_page,
      pages: pagination.pages,
    }
  },

  /**
   * Get single data source by ID
   */
  async getById(id: string): Promise<DataSource> {
    const response = await apiClient.get<{ connection: DataSource }>(`${BASE_PATH}/${id}`)
    return response.data.connection
  },

  /**
   * Create new data source
   */
  async create(data: DataSourceCreate): Promise<DataSource> {
    const response = await apiClient.post<{ connection: DataSource }>(BASE_PATH, data)
    return response.data.connection
  },

  /**
   * Update data source
   */
  async update(id: string, data: DataSourceUpdate): Promise<DataSource> {
    const response = await apiClient.patch<{ connection: DataSource }>(
      `${BASE_PATH}/${id}`,
      data
    )
    return response.data.connection
  },

  /**
   * Delete data source
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`${BASE_PATH}/${id}`)
  },

  /**
   * Test existing connection
   */
  async testConnection(id: string): Promise<ConnectionTestResult> {
    const response = await apiClient.post<ConnectionTestResult>(
      `${BASE_PATH}/${id}/test`
    )
    return response.data
  },

  /**
   * Test connection parameters before saving
   */
  async testNewConnection(data: ConnectionTestRequest): Promise<ConnectionTestResult> {
    const response = await apiClient.post<ConnectionTestResult>(
      `${BASE_PATH}/test`,
      data
    )
    return response.data
  },

  /**
   * Get schema information for a data source
  /**
   * Get schema information for a data source
   */
  async getSchema(
    id: string,
    options?: {
      schema?: string
      schema_name?: string
      include_columns?: boolean
    }
  ): Promise<DataSourceSchema> {
    // Map schema to schema_name for backend compatibility
    const params = {
      ...options,
      schema_name: options?.schema_name || options?.schema,
    }
    delete params.schema
    
    const response = await apiClient.get<{ schema: DataSourceSchema }>(
      `${BASE_PATH}/${id}/schema`,
      { params }
    )
    return response.data.schema
  },

  /**
   * Trigger data sync job
   */
  async triggerSync(id: string, config?: SyncConfig): Promise<SyncJob> {
    // Always send an object body to ensure Content-Type: application/json is set
    const response = await apiClient.post<SyncJob>(
      `${BASE_PATH}/${id}/sync`,
      config || {}
    )
    return response.data
  },

  /**
   * Get sync job status
   */
  async getSyncStatus(id: string, jobId: string): Promise<SyncJob> {
    const response = await apiClient.get<SyncJob>(
      `${BASE_PATH}/${id}/sync/${jobId}`
    )
    return response.data
  },
}
