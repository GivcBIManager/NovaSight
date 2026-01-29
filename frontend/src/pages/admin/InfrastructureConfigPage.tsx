/**
 * Infrastructure Configuration Page
 * 
 * Admin page for configuring infrastructure server connections
 * (ClickHouse, Spark, Airflow)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { infrastructureService } from '../../services/infrastructureService';
import type {
  InfrastructureConfig,
  InfrastructureServiceType,
  InfrastructureConfigCreate,
  InfrastructureConfigTestResult,
} from '../../types/infrastructure';

// Icons for each service
const ServiceIcon: React.FC<{ type: InfrastructureServiceType; className?: string }> = ({ type, className = 'w-6 h-6' }) => {
  switch (type) {
    case 'clickhouse':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M21.333 10H24v4h-2.667v-4zM16 10h2.667v4H16v-4zm-5.333 0H13.333v4h-2.666v-4zM5.333 10H8v4H5.333v-4zM0 10h2.667v4H0v-4z" />
        </svg>
      );
    case 'spark':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      );
    case 'airflow':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      );
    default:
      return null;
  }
};

// Status badge component
const StatusBadge: React.FC<{ status: 'connected' | 'disconnected' | 'testing' | 'unknown' }> = ({ status }) => {
  const styles = {
    connected: 'bg-green-100 text-green-800 border-green-200',
    disconnected: 'bg-red-100 text-red-800 border-red-200',
    testing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    unknown: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const labels = {
    connected: 'Connected',
    disconnected: 'Disconnected',
    testing: 'Testing...',
    unknown: 'Not Tested',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

// Service card component
interface ServiceCardProps {
  serviceType: InfrastructureServiceType;
  config: InfrastructureConfig | null;
  source: 'database' | 'environment';
  testResult: InfrastructureConfigTestResult | null;
  isTesting: boolean;
  onEdit: () => void;
  onTest: () => void;
  onActivate?: () => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  serviceType,
  config,
  source,
  testResult,
  isTesting,
  onEdit,
  onTest,
}) => {
  const labels: Record<InfrastructureServiceType, string> = {
    clickhouse: 'ClickHouse',
    spark: 'Apache Spark',
    airflow: 'Apache Airflow',
  };

  const descriptions: Record<InfrastructureServiceType, string> = {
    clickhouse: 'Column-oriented OLAP database for analytics workloads',
    spark: 'Distributed computing engine for big data processing',
    airflow: 'Workflow orchestration platform for data pipelines',
  };

  const getStatus = (): 'connected' | 'disconnected' | 'testing' | 'unknown' => {
    if (isTesting) return 'testing';
    if (testResult === null) return 'unknown';
    return testResult.success ? 'connected' : 'disconnected';
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${serviceType === 'clickhouse' ? 'bg-yellow-100 text-yellow-600' : serviceType === 'spark' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
            <ServiceIcon type={serviceType} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{labels[serviceType]}</h3>
            <p className="text-sm text-gray-500">{descriptions[serviceType]}</p>
          </div>
        </div>
        <StatusBadge status={getStatus()} />
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center text-sm">
          <span className="text-gray-500 w-20">Host:</span>
          <span className="text-gray-900 font-mono">{config?.host || 'localhost'}</span>
        </div>
        <div className="flex items-center text-sm">
          <span className="text-gray-500 w-20">Port:</span>
          <span className="text-gray-900 font-mono">{config?.port || infrastructureService.getDefaultPort(serviceType)}</span>
        </div>
        <div className="flex items-center text-sm">
          <span className="text-gray-500 w-20">Source:</span>
          <span className={`px-2 py-0.5 text-xs rounded ${source === 'database' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
            {source === 'database' ? 'Custom' : 'Default'}
          </span>
        </div>
        {testResult && (
          <div className="flex items-center text-sm">
            <span className="text-gray-500 w-20">Latency:</span>
            <span className="text-gray-900">{testResult.latency_ms?.toFixed(0) || '-'} ms</span>
          </div>
        )}
        {testResult?.server_version && (
          <div className="flex items-center text-sm">
            <span className="text-gray-500 w-20">Version:</span>
            <span className="text-gray-900">{testResult.server_version}</span>
          </div>
        )}
      </div>

      {testResult && !testResult.success && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{testResult.message}</p>
        </div>
      )}

      <div className="mt-6 flex space-x-3">
        <button
          onClick={onTest}
          disabled={isTesting}
          className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isTesting ? 'Testing...' : 'Test Connection'}
        </button>
        <button
          onClick={onEdit}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
        >
          Configure
        </button>
      </div>
    </div>
  );
};

// Configuration form modal
interface ConfigFormProps {
  serviceType: InfrastructureServiceType;
  existingConfig: InfrastructureConfig | null;
  onSave: (config: InfrastructureConfigCreate) => Promise<void>;
  onCancel: () => void;
  onTest: (config: Partial<InfrastructureConfigCreate>) => Promise<InfrastructureConfigTestResult>;
}

const ConfigForm: React.FC<ConfigFormProps> = ({
  serviceType,
  existingConfig,
  onSave,
  onCancel,
  onTest,
}) => {
  const labels: Record<InfrastructureServiceType, string> = {
    clickhouse: 'ClickHouse',
    spark: 'Apache Spark',
    airflow: 'Apache Airflow',
  };

  const defaultSettings = infrastructureService.getDefaultSettings(serviceType);
  
  const [formData, setFormData] = useState({
    name: existingConfig?.name || `${labels[serviceType]} Connection`,
    description: existingConfig?.description || '',
    host: existingConfig?.host || 'localhost',
    port: existingConfig?.port || infrastructureService.getDefaultPort(serviceType),
    settings: { ...defaultSettings, ...existingConfig?.settings } as Record<string, unknown>,
    is_active: existingConfig?.is_active ?? true,
  });

  const [testResult, setTestResult] = useState<InfrastructureConfigTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) : value,
    }));
  };

  const handleSettingChange = (key: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      settings: { ...prev.settings, [key]: value },
    }));
  };

  const handleTest = async () => {
    setIsTesting(true);
    setError(null);
    try {
      const result = await onTest({
        service_type: serviceType,
        host: formData.host,
        port: formData.port,
        settings: formData.settings as Record<string, unknown>,
      });
      setTestResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        service_type: serviceType,
        name: formData.name,
        description: formData.description,
        host: formData.host,
        port: formData.port,
        settings: formData.settings,
        is_active: formData.is_active,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
      setIsSaving(false);
    }
  };

  // Render settings fields based on service type
  const renderSettingsFields = () => {
    switch (serviceType) {
      case 'clickhouse':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Database</label>
                <input
                  type="text"
                  value={formData.settings.database as string || ''}
                  onChange={(e) => handleSettingChange('database', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">User</label>
                <input
                  type="text"
                  value={formData.settings.user as string || ''}
                  onChange={(e) => handleSettingChange('user', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={formData.settings.password as string || ''}
                onChange={(e) => handleSettingChange('password', e.target.value)}
                placeholder="Leave empty to keep existing"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.settings.secure as boolean || false}
                  onChange={(e) => handleSettingChange('secure', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Use TLS/SSL</span>
              </label>
            </div>
          </>
        );
      
      case 'spark':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Master URL</label>
              <input
                type="text"
                value={formData.settings.master_url as string || ''}
                onChange={(e) => handleSettingChange('master_url', e.target.value)}
                placeholder="spark://localhost:7077"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Driver Memory</label>
                <input
                  type="text"
                  value={formData.settings.driver_memory as string || ''}
                  onChange={(e) => handleSettingChange('driver_memory', e.target.value)}
                  placeholder="2g"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Executor Memory</label>
                <input
                  type="text"
                  value={formData.settings.executor_memory as string || ''}
                  onChange={(e) => handleSettingChange('executor_memory', e.target.value)}
                  placeholder="2g"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Executor Cores</label>
                <input
                  type="number"
                  value={formData.settings.executor_cores as number || 2}
                  onChange={(e) => handleSettingChange('executor_cores', parseInt(e.target.value))}
                  min={1}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Min Executors</label>
                <input
                  type="number"
                  value={formData.settings.min_executors as number || 1}
                  onChange={(e) => handleSettingChange('min_executors', parseInt(e.target.value))}
                  min={0}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Max Executors</label>
                <input
                  type="number"
                  value={formData.settings.max_executors as number || 10}
                  onChange={(e) => handleSettingChange('max_executors', parseInt(e.target.value))}
                  min={1}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </>
        );
      
      case 'airflow':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Base URL</label>
              <input
                type="text"
                value={formData.settings.base_url as string || ''}
                onChange={(e) => handleSettingChange('base_url', e.target.value)}
                placeholder="http://localhost:8080"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  value={formData.settings.username as string || ''}
                  onChange={(e) => handleSettingChange('username', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  value={formData.settings.password as string || ''}
                  onChange={(e) => handleSettingChange('password', e.target.value)}
                  placeholder="Leave empty to keep existing"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">DAG Folder</label>
              <input
                type="text"
                value={formData.settings.dag_folder as string || ''}
                onChange={(e) => handleSettingChange('dag_folder', e.target.value)}
                placeholder="/opt/airflow/dags"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onCancel} />

        {/* Modal */}
        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Configure {labels[serviceType]}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {/* Basic Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Configuration Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={2}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {/* Connection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Host</label>
                <input
                  type="text"
                  name="host"
                  value={formData.host}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Port</label>
                <input
                  type="number"
                  name="port"
                  value={formData.port}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Service-specific settings */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Service Settings</h3>
              <div className="space-y-4">
                {renderSettingsFields()}
              </div>
            </div>

            {/* Test Result */}
            {testResult && (
              <div className={`p-4 rounded-md ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center">
                  <span className={`text-sm font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {testResult.success ? '✓ Connection successful' : '✗ Connection failed'}
                  </span>
                  {testResult.latency_ms && (
                    <span className="ml-2 text-sm text-gray-500">({testResult.latency_ms.toFixed(0)} ms)</span>
                  )}
                </div>
                {testResult.server_version && (
                  <p className="mt-1 text-sm text-gray-600">Version: {testResult.server_version}</p>
                )}
                {!testResult.success && (
                  <p className="mt-1 text-sm text-red-700">{testResult.message}</p>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleTest}
              disabled={isTesting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main page component
const InfrastructureConfigPage: React.FC = () => {
  const [configs, setConfigs] = useState<Record<InfrastructureServiceType, { config: InfrastructureConfig | null; source: 'database' | 'environment' }>>({
    clickhouse: { config: null, source: 'environment' },
    spark: { config: null, source: 'environment' },
    airflow: { config: null, source: 'environment' },
  });
  const [testResults, setTestResults] = useState<Record<InfrastructureServiceType, InfrastructureConfigTestResult | null>>({
    clickhouse: null,
    spark: null,
    airflow: null,
  });
  const [testingServices, setTestingServices] = useState<Set<InfrastructureServiceType>>(new Set());
  const [editingService, setEditingService] = useState<InfrastructureServiceType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all configurations
  const loadConfigs = useCallback(async () => {
    setIsLoading(true);
    try {
      const allConfigs = await infrastructureService.getAllActiveConfigs();
      const newConfigs: typeof configs = {
        clickhouse: { config: null, source: 'environment' },
        spark: { config: null, source: 'environment' },
        airflow: { config: null, source: 'environment' },
      };

      for (const [type, response] of Object.entries(allConfigs)) {
        if (response) {
          newConfigs[type as InfrastructureServiceType] = {
            config: response.config,
            source: response.source || 'environment',
          };
        }
      }

      setConfigs(newConfigs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configurations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  // Test a service connection
  const handleTest = async (serviceType: InfrastructureServiceType) => {
    setTestingServices(prev => new Set([...prev, serviceType]));
    try {
      const config = configs[serviceType].config;
      let result: InfrastructureConfigTestResult;

      if (config?.id) {
        result = await infrastructureService.testConnection({ config_id: config.id });
      } else {
        result = await infrastructureService.testConnection({
          service_type: serviceType,
          host: config?.host || 'localhost',
          port: config?.port || infrastructureService.getDefaultPort(serviceType),
          settings: config?.settings || infrastructureService.getDefaultSettings(serviceType),
        });
      }

      setTestResults(prev => ({ ...prev, [serviceType]: result }));
    } catch (err) {
      setTestResults(prev => ({
        ...prev,
        [serviceType]: {
          success: false,
          message: err instanceof Error ? err.message : 'Test failed',
        },
      }));
    } finally {
      setTestingServices(prev => {
        const next = new Set(prev);
        next.delete(serviceType);
        return next;
      });
    }
  };

  // Test all services
  const handleTestAll = async () => {
    const services: InfrastructureServiceType[] = ['clickhouse', 'spark', 'airflow'];
    await Promise.all(services.map(s => handleTest(s)));
  };

  // Handle save configuration
  const handleSave = async (config: InfrastructureConfigCreate) => {
    const serviceType = config.service_type;
    const existingConfig = configs[serviceType].config;

    if (existingConfig?.id && !existingConfig.is_system_default) {
      // Update existing
      await infrastructureService.updateConfig(existingConfig.id, {
        name: config.name,
        description: config.description,
        host: config.host,
        port: config.port,
        settings: config.settings,
        is_active: config.is_active,
      });
    } else {
      // Create new
      await infrastructureService.createConfig(config);
    }

    setEditingService(null);
    await loadConfigs();
  };

  // Handle inline test from form
  const handleFormTest = async (config: Partial<InfrastructureConfigCreate>): Promise<InfrastructureConfigTestResult> => {
    return infrastructureService.testConnection({
      service_type: config.service_type,
      host: config.host,
      port: config.port,
      settings: config.settings,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Infrastructure Configuration</h1>
        <p className="mt-2 text-sm text-gray-600">
          Configure connections to your infrastructure servers. Default settings are used for development and testing.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-600 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-6 flex space-x-4">
        <button
          onClick={handleTestAll}
          disabled={testingServices.size > 0}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          Test All Connections
        </button>
        <button
          onClick={loadConfigs}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* Service Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(['clickhouse', 'spark', 'airflow'] as InfrastructureServiceType[]).map(serviceType => (
          <ServiceCard
            key={serviceType}
            serviceType={serviceType}
            config={configs[serviceType].config}
            source={configs[serviceType].source}
            testResult={testResults[serviceType]}
            isTesting={testingServices.has(serviceType)}
            onEdit={() => setEditingService(serviceType)}
            onTest={() => handleTest(serviceType)}
          />
        ))}
      </div>

      {/* Configuration Form Modal */}
      {editingService && (
        <ConfigForm
          serviceType={editingService}
          existingConfig={configs[editingService].config}
          onSave={handleSave}
          onCancel={() => setEditingService(null)}
          onTest={handleFormTest}
        />
      )}

      {/* Help Text */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="text-sm font-medium text-blue-800">About Infrastructure Configuration</h3>
        <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
          <li>Default configurations are loaded from environment variables if no custom config is set</li>
          <li>Custom configurations are stored securely in the database</li>
          <li>Credentials are encrypted before storage</li>
          <li>Test connections before saving to ensure connectivity</li>
          <li>Only one active configuration per service type is allowed</li>
        </ul>
      </div>
    </div>
  );
};

export default InfrastructureConfigPage;
