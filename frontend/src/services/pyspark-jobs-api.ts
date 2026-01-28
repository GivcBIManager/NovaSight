/**
 * API service for PySpark job management
 */

import { apiClient } from './apiClient';
import type {
  PySparkJobConfig,
  CreatePySparkJobRequest,
  UpdatePySparkJobRequest,
  PySparkJobsListResponse,
  GeneratedCode,
  TableColumnsResponse,
  TablesListResponse,
  QueryValidationResponse,
} from '@/types/pyspark';

export const pysparkJobsApi = {
  /**
   * List all PySpark jobs
   */
  list: async (params?: {
    page?: number;
    per_page?: number;
    status?: string;
    connection_id?: string;
    search?: string;
  }): Promise<PySparkJobsListResponse> => {
    const response = await apiClient.get('/pyspark-jobs', { params });
    return response.data;
  },

  /**
   * Get a specific PySpark job
   */
  get: async (jobId: string, includeCode: boolean = false): Promise<PySparkJobConfig> => {
    const response = await apiClient.get(`/pyspark-jobs/${jobId}`, {
      params: { include_code: includeCode },
    });
    return response.data;
  },

  /**
   * Create a new PySpark job
   */
  create: async (data: CreatePySparkJobRequest): Promise<PySparkJobConfig> => {
    const response = await apiClient.post('/pyspark-jobs', data);
    return response.data;
  },

  /**
   * Update an existing PySpark job
   */
  update: async (jobId: string, data: UpdatePySparkJobRequest): Promise<PySparkJobConfig> => {
    const response = await apiClient.put(`/pyspark-jobs/${jobId}`, data);
    return response.data;
  },

  /**
   * Delete a PySpark job
   */
  delete: async (jobId: string): Promise<void> => {
    await apiClient.delete(`/pyspark-jobs/${jobId}`);
  },

  /**
   * Generate PySpark code for a job
   */
  generateCode: async (jobId: string): Promise<GeneratedCode> => {
    const response = await apiClient.post(`/pyspark-jobs/${jobId}/generate`);
    return response.data;
  },

  /**
   * Preview generated PySpark code
   */
  previewCode: async (jobId: string, format: 'json' | 'text' = 'json'): Promise<GeneratedCode | string> => {
    const response = await apiClient.get(`/pyspark-jobs/${jobId}/preview`, {
      params: { format },
    });
    return response.data;
  },

  /**
   * Download generated PySpark code as a file
   */
  downloadCode: async (jobId: string, jobName: string): Promise<void> => {
    const response = await apiClient.get(`/pyspark-jobs/${jobId}/download`, {
      responseType: 'blob',
    });
    
    // Create a download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${jobName}.py`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Activate a PySpark job
   */
  activate: async (jobId: string): Promise<PySparkJobConfig> => {
    const response = await apiClient.post(`/pyspark-jobs/${jobId}/activate`);
    return response.data;
  },

  /**
   * Deactivate a PySpark job
   */
  deactivate: async (jobId: string): Promise<PySparkJobConfig> => {
    const response = await apiClient.post(`/pyspark-jobs/${jobId}/deactivate`);
    return response.data;
  },
};

export const connectionsApi = {
  /**
   * List tables in a connection
   */
  listTables: async (
    connectionId: string,
    params?: {
      schema_name?: string;
      search?: string;
    }
  ): Promise<TablesListResponse> => {
    const response = await apiClient.get(`/connections/${connectionId}/tables`, { params });
    return response.data;
  },

  /**
   * Get columns for a specific table
   */
  getTableColumns: async (
    connectionId: string,
    tableName: string,
    schemaName?: string
  ): Promise<TableColumnsResponse> => {
    const response = await apiClient.get(`/connections/${connectionId}/tables/${tableName}/columns`, {
      params: { schema_name: schemaName },
    });
    return response.data;
  },

  /**
   * Validate a SQL query
   */
  validateQuery: async (connectionId: string, query: string): Promise<QueryValidationResponse> => {
    const response = await apiClient.post(`/connections/${connectionId}/query/validate`, {
      query,
    });
    return response.data;
  },
};
