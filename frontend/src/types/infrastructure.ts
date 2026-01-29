/**
 * Infrastructure Configuration Types
 * 
 * Type definitions for infrastructure server configurations
 * (ClickHouse, Spark, Airflow)
 */

// Service types
export type InfrastructureServiceType = 'clickhouse' | 'spark' | 'airflow';

// Base configuration interface
export interface InfrastructureConfig {
  id: string;
  service_type: InfrastructureServiceType;
  tenant_id: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  is_system_default: boolean;
  host: string;
  port: number;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_test_at: string | null;
  last_test_success: boolean | null;
  last_test_message: string | null;
}

// ClickHouse-specific settings
export interface ClickHouseSettings {
  database: string;
  user: string;
  password?: string;
  secure: boolean;
  connect_timeout: number;
  send_receive_timeout: number;
  verify_ssl: boolean;
}

// Spark-specific settings
export interface SparkSettings {
  master_url: string;
  deploy_mode: 'client' | 'cluster';
  driver_memory: string;
  executor_memory: string;
  executor_cores: number;
  dynamic_allocation: boolean;
  min_executors: number;
  max_executors: number;
  spark_home: string;
  additional_configs: Record<string, string>;
}

// Airflow-specific settings
export interface AirflowSettings {
  base_url: string;
  api_version: string;
  username: string;
  password?: string;
  dag_folder: string;
  request_timeout: number;
  verify_ssl: boolean;
}

// Create/Update DTOs
export interface InfrastructureConfigCreate {
  service_type: InfrastructureServiceType;
  name: string;
  description?: string;
  host: string;
  port: number;
  settings: Record<string, unknown>;
  tenant_id?: string | null;
  is_active?: boolean;
}

export interface InfrastructureConfigUpdate {
  name?: string;
  description?: string;
  host?: string;
  port?: number;
  settings?: Partial<ClickHouseSettings | SparkSettings | AirflowSettings>;
  is_active?: boolean;
}

// Connection test
export interface InfrastructureConfigTestRequest {
  config_id?: string;
  service_type?: InfrastructureServiceType;
  host?: string;
  port?: number;
  settings?: Record<string, unknown>;
}

export interface InfrastructureConfigTestResult {
  success: boolean;
  message: string;
  latency_ms?: number;
  server_version?: string;
  details?: Record<string, unknown>;
}

// API Response types
export interface InfrastructureConfigResponse {
  config: InfrastructureConfig;
  source?: 'database' | 'environment';
}

export interface InfrastructureConfigListResponse {
  items: InfrastructureConfig[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// Service status for display
export interface InfrastructureServiceStatus {
  service_type: InfrastructureServiceType;
  display_name: string;
  icon: string;
  has_config: boolean;
  is_connected: boolean;
  last_test_at: string | null;
  config?: InfrastructureConfig;
}

// Form state for configuration wizard
export interface InfrastructureConfigFormState {
  step: 'type' | 'connection' | 'settings' | 'test' | 'complete';
  service_type: InfrastructureServiceType | null;
  name: string;
  description: string;
  host: string;
  port: number;
  settings: Record<string, unknown>;
  test_result: InfrastructureConfigTestResult | null;
  is_testing: boolean;
  error: string | null;
}

// Default ports for each service
export const DEFAULT_PORTS: Record<InfrastructureServiceType, number> = {
  clickhouse: 8123,
  spark: 7077,
  airflow: 8080,
};

// Display labels
export const SERVICE_LABELS: Record<InfrastructureServiceType, string> = {
  clickhouse: 'ClickHouse',
  spark: 'Apache Spark',
  airflow: 'Apache Airflow',
};

// Service descriptions
export const SERVICE_DESCRIPTIONS: Record<InfrastructureServiceType, string> = {
  clickhouse: 'Column-oriented OLAP database for analytics workloads',
  spark: 'Distributed computing engine for big data processing',
  airflow: 'Workflow orchestration platform for data pipelines',
};
