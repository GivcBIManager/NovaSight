/**
 * Infrastructure Configuration API Service
 * 
 * API client for managing infrastructure server configurations
 * (ClickHouse, Spark, Airflow)
 */

import { apiClient } from './apiClient';
import type {
  InfrastructureConfig,
  InfrastructureConfigCreate,
  InfrastructureConfigUpdate,
  InfrastructureConfigListResponse,
  InfrastructureConfigResponse,
  InfrastructureConfigTestRequest,
  InfrastructureConfigTestResult,
  InfrastructureServiceType,
} from '../types/infrastructure';

const BASE_PATH = '/api/v1/admin/infrastructure';

/**
 * Infrastructure configuration API service
 */
export const infrastructureService = {
  /**
   * List all infrastructure configurations
   */
  async listConfigs(params?: {
    service_type?: InfrastructureServiceType;
    tenant_id?: string;
    include_global?: boolean;
    page?: number;
    per_page?: number;
  }): Promise<InfrastructureConfigListResponse> {
    const response = await apiClient.get(`${BASE_PATH}/configs`, { params });
    return response.data;
  },

  /**
   * Get a specific configuration by ID
   */
  async getConfig(configId: string): Promise<InfrastructureConfigResponse> {
    const response = await apiClient.get(`${BASE_PATH}/configs/${configId}`);
    return response.data;
  },

  /**
   * Get the active configuration for a service type
   */
  async getActiveConfig(
    serviceType: InfrastructureServiceType,
    tenantId?: string
  ): Promise<InfrastructureConfigResponse> {
    const params = tenantId ? { tenant_id: tenantId } : {};
    const response = await apiClient.get(`${BASE_PATH}/configs/active/${serviceType}`, { params });
    return response.data;
  },

  /**
   * Create a new infrastructure configuration
   */
  async createConfig(data: InfrastructureConfigCreate): Promise<{
    config: InfrastructureConfig;
    message: string;
  }> {
    const response = await apiClient.post(`${BASE_PATH}/configs`, data);
    return response.data;
  },

  /**
   * Update an existing configuration
   */
  async updateConfig(
    configId: string,
    data: InfrastructureConfigUpdate
  ): Promise<{
    config: InfrastructureConfig;
    message: string;
  }> {
    const response = await apiClient.put(`${BASE_PATH}/configs/${configId}`, data);
    return response.data;
  },

  /**
   * Delete a configuration
   */
  async deleteConfig(configId: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`${BASE_PATH}/configs/${configId}`);
    return response.data;
  },

  /**
   * Test connection to an infrastructure service
   */
  async testConnection(data: InfrastructureConfigTestRequest): Promise<InfrastructureConfigTestResult> {
    const response = await apiClient.post(`${BASE_PATH}/configs/test`, data);
    return response.data;
  },

  /**
   * Activate a configuration (deactivates others of same type/scope)
   */
  async activateConfig(configId: string): Promise<{
    config: InfrastructureConfig;
    message: string;
  }> {
    const response = await apiClient.post(`${BASE_PATH}/configs/${configId}/activate`);
    return response.data;
  },

  /**
   * Initialize system default configurations
   */
  async initializeDefaults(): Promise<{ message: string }> {
    const response = await apiClient.post(`${BASE_PATH}/defaults`);
    return response.data;
  },

  /**
   * Get all active configurations for display/dashboard
   */
  async getAllActiveConfigs(tenantId?: string): Promise<Record<InfrastructureServiceType, InfrastructureConfigResponse | null>> {
    const serviceTypes: InfrastructureServiceType[] = ['clickhouse', 'spark', 'airflow', 'ollama'];
    const results: Record<string, InfrastructureConfigResponse | null> = {
      clickhouse: null,
      spark: null,
      airflow: null,
      ollama: null,
    };

    await Promise.all(
      serviceTypes.map(async (serviceType) => {
        try {
          results[serviceType] = await this.getActiveConfig(serviceType, tenantId);
        } catch {
          results[serviceType] = null;
        }
      })
    );

    return results as Record<InfrastructureServiceType, InfrastructureConfigResponse | null>;
  },

  /**
   * Test all active configurations
   */
  async testAllConnections(tenantId?: string): Promise<Record<InfrastructureServiceType, InfrastructureConfigTestResult>> {
    const serviceTypes: InfrastructureServiceType[] = ['clickhouse', 'spark', 'airflow', 'ollama'];
    const results: Record<string, InfrastructureConfigTestResult> = {
      clickhouse: { success: false, message: 'Not tested' },
      spark: { success: false, message: 'Not tested' },
      airflow: { success: false, message: 'Not tested' },
      ollama: { success: false, message: 'Not tested' },
    };

    await Promise.all(
      serviceTypes.map(async (serviceType) => {
        try {
          const activeConfig = await this.getActiveConfig(serviceType, tenantId);
          if (activeConfig?.config?.id) {
            results[serviceType] = await this.testConnection({ config_id: activeConfig.config.id });
          } else {
            // Test with inline params from environment defaults
            results[serviceType] = await this.testConnection({
              service_type: serviceType,
              host: activeConfig?.config?.host || 'localhost',
              port: activeConfig?.config?.port || this.getDefaultPort(serviceType),
              settings: activeConfig?.config?.settings || {},
            });
          }
        } catch (error) {
          results[serviceType] = {
            success: false,
            message: error instanceof Error ? error.message : 'Connection test failed',
          };
        }
      })
    );

    return results as Record<InfrastructureServiceType, InfrastructureConfigTestResult>;
  },

  /**
   * Get default port for a service type
   */
  getDefaultPort(serviceType: InfrastructureServiceType): number {
    const defaultPorts: Record<InfrastructureServiceType, number> = {
      clickhouse: 8123,
      spark: 7077,
      airflow: 8080,
      ollama: 11434,
    };
    return defaultPorts[serviceType];
  },

  /**
   * Get default settings for a service type
   */
  getDefaultSettings(serviceType: InfrastructureServiceType): Record<string, unknown> {
    switch (serviceType) {
      case 'clickhouse':
        return {
          database: 'novasight',
          user: 'default',
          secure: false,
          connect_timeout: 10,
          send_receive_timeout: 300,
          verify_ssl: true,
        };
      case 'spark':
        return {
          master_url: 'spark://localhost:7077',
          deploy_mode: 'client',
          driver_memory: '2g',
          executor_memory: '2g',
          executor_cores: 2,
          dynamic_allocation: true,
          min_executors: 1,
          max_executors: 10,
          spark_home: '/opt/spark',
          additional_configs: {},
        };
      case 'airflow':
        return {
          base_url: 'http://localhost:8080',
          api_version: 'v1',
          username: 'airflow',
          dag_folder: '/opt/airflow/dags',
          request_timeout: 30,
          verify_ssl: true,
        };
      case 'ollama':
        return {
          base_url: 'http://localhost:11434',
          default_model: 'llama3.2',
          request_timeout: 120,
          num_ctx: 4096,
          temperature: 0.7,
          keep_alive: '5m',
        };
      default:
        return {};
    }
  },
};

export default infrastructureService;
