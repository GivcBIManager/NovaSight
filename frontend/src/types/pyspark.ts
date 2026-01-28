/**
 * TypeScript types for PySpark Job Configuration
 */

export type SourceType = 'table' | 'sql_query';

export type SCDType = 'type_0' | 'type_1' | 'type_2';

export type WriteMode = 'append' | 'overwrite' | 'upsert' | 'merge';

export type JobStatus = 'draft' | 'active' | 'inactive' | 'archived';

export interface SparkConfig {
  [key: string]: string;
}

export interface PySparkJobConfig {
  id: string;
  tenant_id: string;
  job_name: string;
  description?: string;
  
  // Data source configuration
  connection_id: string;
  source_type: SourceType;
  source_table?: string;
  source_query?: string;
  
  // Column configuration
  selected_columns: string[];
  primary_keys: string[];
  
  // SCD configuration
  scd_type: SCDType;
  write_mode: WriteMode;
  
  // CDC configuration
  cdc_column?: string;
  
  // Partitioning
  partition_columns: string[];
  
  // Target configuration
  target_database: string;
  target_table: string;
  target_schema?: string;
  
  // Spark configuration
  spark_config: SparkConfig;
  
  // Metadata
  config_version: number;
  status: JobStatus;
  last_generated_at?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  
  // Optional generated code (only when requested)
  generated_code?: string;
  code_hash?: string;
}

export interface CreatePySparkJobRequest {
  job_name: string;
  description?: string;
  connection_id: string;
  source_type: SourceType;
  source_table?: string;
  source_query?: string;
  selected_columns?: string[];
  primary_keys?: string[];
  scd_type?: SCDType;
  write_mode?: WriteMode;
  cdc_column?: string;
  partition_columns?: string[];
  target_database: string;
  target_table: string;
  target_schema?: string;
  spark_config?: SparkConfig;
}

export interface UpdatePySparkJobRequest {
  description?: string;
  source_type?: SourceType;
  source_table?: string;
  source_query?: string;
  selected_columns?: string[];
  primary_keys?: string[];
  scd_type?: SCDType;
  write_mode?: WriteMode;
  cdc_column?: string;
  partition_columns?: string[];
  target_database?: string;
  target_table?: string;
  target_schema?: string;
  spark_config?: SparkConfig;
  status?: JobStatus;
}

export interface PySparkJobsListResponse {
  items: PySparkJobConfig[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface GeneratedCode {
  job_id: string;
  job_name: string;
  code: string;
  code_hash: string;
  generated_at: string;
  config_version: number;
}

export interface TableColumn {
  name: string;
  type: string;
  nullable?: boolean;
  primary_key?: boolean;
  description?: string;
}

export interface TableColumnsResponse {
  connection_id: string;
  table_name: string;
  schema_name?: string;
  columns: TableColumn[];
  count: number;
}

export interface TablesListResponse {
  connection_id: string;
  schema_name?: string;
  tables: string[];
  count: number;
}

export interface QueryValidationResponse {
  valid: boolean;
  message: string;
  query: string;
}
