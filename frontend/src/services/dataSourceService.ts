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
import type { ApiResponse, PaginatedResponse } from '@/types/api'

const BASE_PATH = '/api/v1/connections'

export const dataSourceService = {
  /**
   * Get all data sources
   */
  async getAll(params?: {
    page?: number
    per_page?: number
    db_type?: string
    status?: string
  }): Promise<PaginatedResponse<DataSource>> {
    const response = await apiClient.get<PaginatedResponse<DataSource>>(BASE_PATH, {
      params,
    })
    return response.data
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
   */
  async getSchema(
    id: string,
    options?: {
      schema?: string
      include_columns?: boolean
    }
  ): Promise<DataSourceSchema> {
    const response = await apiClient.get<{ schema: DataSourceSchema }>(
      `${BASE_PATH}/${id}/schema`,
      { params: options }
    )
    return response.data.schema
  },

  /**
   * Trigger data sync job
   */
  async triggerSync(id: string, config?: SyncConfig): Promise<SyncJob> {
    const response = await apiClient.post<SyncJob>(
      `${BASE_PATH}/${id}/sync`,
      config
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
