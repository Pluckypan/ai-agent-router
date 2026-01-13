'use client';

import { useState, useEffect, useCallback } from 'react';
import Nav from './components/Nav';
import { useToast } from './components/ToastProvider';

interface Config {
  port?: string;
  api_key?: string;
}

interface ServiceStatus {
  status: 'running' | 'stopped';
  port?: number;
  pid?: number | null;
  started_at?: string | null;
  error?: string;
}

interface Model {
  id: number;
  provider_id: number;
  name: string;
  model_id: string;
  enabled: boolean;
  provider_name?: string;
  provider_protocol?: string;
}

export default function Home() {
  const [config, setConfig] = useState<Config>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({ status: 'stopped' });
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [showExampleConfig, setShowExampleConfig] = useState(false);
  const { showToast } = useToast();

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      setConfig({
        port: data.port || '1357',
        api_key: data.api_key || '',
      });
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadServiceStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/service/status');
      const data = await res.json();
      setServiceStatus(prevServiceStatus => {
        // Clear test result and selected model when service stops
        if (prevServiceStatus.status === 'running' && data.status === 'stopped') {
          setTestResult(null);
          setSelectedModel(null);
          setModelSearchQuery('');
          setShowExampleConfig(false);
        }
        return data;
      });
    } catch (error) {
      console.error('Failed to load service status:', error);
    }
  }, []);

  const loadModels = useCallback(async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      // Only show enabled models
      const enabledModels = data.filter((m: Model) => m.enabled);
      setModels(enabledModels);
      
      // Clear selected model if it's no longer enabled
      if (selectedModel && !enabledModels.find((m: Model) => m.id === selectedModel.id)) {
        setSelectedModel(null);
        setModelSearchQuery('');
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  }, [selectedModel]);

  useEffect(() => {
    loadConfig();
    loadServiceStatus();
    loadModels();
    
    // Poll service status every 2 seconds
    const interval = setInterval(loadServiceStatus, 2000);
    
    return () => clearInterval(interval);
  }, [loadConfig, loadServiceStatus, loadModels]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-model-selector]')) {
        setShowModelDropdown(false);
      }
    };

    if (showModelDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showModelDropdown]);

  const handleStart = async () => {
    if (starting || serviceStatus.status === 'running') return;

    setStarting(true);
    try {
      // Use default port if not configured
      const port = config.port ? parseInt(config.port, 10) : 1357;

      const res = await fetch('/api/service/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port }),
      });
      const data = await res.json();

      if (data.error) {
        showToast(`启动失败: ${data.error}`, 'error');
      } else {
        showToast('服务已启动', 'success');
        setServiceStatus(data);
      }
    } catch (error: any) {
      console.error('Failed to start service:', error);
      showToast('启动失败', 'error');
    } finally {
      setStarting(false);
      // Reload status after a short delay
      setTimeout(loadServiceStatus, 500);
    }
  };

  const handleStop = async () => {
    if (stopping || serviceStatus.status === 'stopped') return;
    
    setStopping(true);
    try {
      const res = await fetch('/api/service/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      
      if (data.error) {
        showToast(`停止失败: ${data.error}`, 'error');
      } else {
        showToast('服务已停止', 'success');
        setServiceStatus(data);
      }
    } catch (error: any) {
      console.error('Failed to stop service:', error);
      showToast('停止失败', 'error');
    } finally {
      setStopping(false);
      // Reload status after a short delay
      setTimeout(loadServiceStatus, 500);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'port',
          value: config.port,
        }),
      });
      if (config.api_key) {
        await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: 'api_key',
            value: config.api_key,
          }),
        });
      }
      showToast('配置已保存', 'success');
    } catch (error) {
      console.error('Failed to save config:', error);
      showToast('保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredModels = models.filter((model) => {
    if (!modelSearchQuery) return true;
    const query = modelSearchQuery.toLowerCase();
    return (
      model.name.toLowerCase().includes(query) ||
      model.model_id.toLowerCase().includes(query) ||
      model.provider_name?.toLowerCase().includes(query)
    );
  });

  const handleTestGateway = async () => {
    if (!selectedModel) {
      showToast('请先选择模型', 'error');
      return;
    }

    if (serviceStatus.status !== 'running' || !serviceStatus.port) {
      showToast('网关服务未运行', 'error');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const gatewayUrl = `http://localhost:${serviceStatus.port}`;
      const testPayload = {
        model: selectedModel.model_id,
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a test message. Please respond with "Test successful".',
          },
        ],
        max_tokens: 50,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (config.api_key) {
        headers['Authorization'] = `Bearer ${config.api_key}`;
      }

      // Use root path with model and provider in query parameter
      // Include provider to avoid conflicts if multiple providers have same model_id
      const testUrl = `${gatewayUrl}/?model=${encodeURIComponent(selectedModel.model_id)}&provider=${encodeURIComponent(selectedModel.provider_name || '')}`;
      
      console.log('[Test] Sending request to:', testUrl);
      console.log('[Test] Headers:', headers);
      console.log('[Test] Payload:', testPayload);
      
      const response = await fetch(testUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(testPayload),
      });
      
      console.log('[Test] Response status:', response.status);
      console.log('[Test] Response headers:', Object.fromEntries(response.headers.entries()));

      // Read response as text first to handle potential JSON parsing errors
      const responseText = await response.text();
      let data: any;
      
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch (parseError: any) {
        // If JSON parsing fails, return the raw text
        setTestResult({
          success: false,
          status: response.status,
          error: {
            message: 'Invalid JSON response from gateway',
            rawResponse: responseText.substring(0, 500), // Limit to first 500 chars
            parseError: parseError.message,
          },
        });
        showToast('测试失败: 响应格式错误', 'error');
        setTesting(false);
        return;
      }

      if (response.ok) {
        setTestResult({
          success: true,
          status: response.status,
          data,
        });
        showToast('测试成功', 'success');
      } else {
        setTestResult({
          success: false,
          status: response.status,
          error: data,
        });
        showToast('测试失败', 'error');
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        error: {
          message: error.message || '网络错误',
          type: 'network_error',
        },
      });
      showToast('测试失败: ' + (error.message || '未知错误'), 'error');
    } finally {
      setTesting(false);
    }
  };

  const getExampleConfig = () => {
    if (!selectedModel || serviceStatus.status !== 'running' || !serviceStatus.port) {
      return null;
    }

    const gatewayUrl = `http://localhost:${serviceStatus.port}`;
    const exampleConfig = {
      endpoint: `${gatewayUrl}?model=${selectedModel.model_id}&provider=${selectedModel.provider_name || ''}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.api_key ? { Authorization: `Bearer ${config.api_key}` } : {}),
      },
      body: {
        model: selectedModel.model_id,
        messages: [
          {
            role: 'user',
            content: 'Hello!',
          },
        ],
        max_tokens: 100,
      },
      note: 'The provider parameter is optional but recommended to avoid conflicts when multiple providers have the same model_id.',
    };

    return exampleConfig;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/30 via-white to-slate-50/50">
      <Nav />

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-4 sm:px-0">
          <div className="bg-white/70 backdrop-blur-sm shadow-md rounded-2xl border border-emerald-100/50">
            <div className="px-6 py-5 sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-800 mb-1">网关配置</h2>
                <p className="text-xs text-slate-500">配置 API 网关的运行参数</p>
              </div>
              
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    端口
                  </label>
                  <input
                    type="number"
                    value={config.port}
                    onChange={(e) => setConfig({ ...config, port: e.target.value })}
                    autoComplete="off"
                    className="block w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs shadow-sm transition-all duration-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 focus:ring-offset-1"
                    placeholder="1357"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    提示：API 网关默认端口为 1357
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    API Key (可选)
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={config.api_key}
                      onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                      autoComplete="new-password"
                      className="block w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 pr-9 text-xs shadow-sm transition-all duration-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 focus:ring-offset-1"
                      placeholder="留空则不验证"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showApiKey ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div>
                    <span className="text-xs text-slate-500">状态: </span>
                    <span className={`text-xs font-medium ${serviceStatus.status === 'running' ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {serviceStatus.status === 'running' ? '运行中' : '已停止'}
                    </span>
                    {serviceStatus.status === 'running' && serviceStatus.port && (
                      <span className="text-xs text-slate-400 ml-2">(端口: {serviceStatus.port})</span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={saveConfig}
                      disabled={saving || serviceStatus.status === 'running'}
                      className="inline-flex items-center px-3.5 py-1.5 border border-transparent text-xs font-semibold rounded-lg shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      {saving ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          保存中
                        </>
                      ) : (
                        '保存配置'
                      )}
                    </button>
                    <button
                      onClick={serviceStatus.status === 'running' ? handleStop : handleStart}
                      disabled={starting || stopping}
                      className={`inline-flex items-center px-3.5 py-1.5 border border-transparent text-xs font-semibold rounded-lg shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                        serviceStatus.status === 'running'
                          ? 'bg-rose-500 hover:bg-rose-600 focus:ring-rose-500/50'
                          : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/50'
                      }`}
                    >
                      {starting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          启动中
                        </>
                      ) : stopping ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          停止中
                        </>
                      ) : serviceStatus.status === 'running' ? (
                        <>
                          <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                          </svg>
                          停止
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          启动
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gateway Test Section - Only show when service is running */}
          {serviceStatus.status === 'running' && serviceStatus.port && (
            <div className="mt-6 bg-white/70 backdrop-blur-sm shadow-md rounded-2xl border border-emerald-100/50">
              <div className="px-6 py-5 sm:p-6">
                <div className="mb-5">
                  <h2 className="text-lg font-bold text-slate-800 mb-1">网关测试</h2>
                  <p className="text-xs text-slate-500">测试网关服务连接和模型可用性</p>
                </div>

                <div className="space-y-4">
                  {/* Model Search and Selection */}
                  <div data-model-selector>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      选择模型
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={selectedModel ? selectedModel.name : modelSearchQuery}
                        onChange={(e) => {
                          setModelSearchQuery(e.target.value);
                          setShowModelDropdown(true);
                          if (selectedModel) {
                            setSelectedModel(null);
                          }
                        }}
                        onFocus={() => setShowModelDropdown(true)}
                        placeholder="搜索模型名称、ID 或供应商..."
                        className="block w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 pr-9 text-xs shadow-sm transition-all duration-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 focus:ring-offset-1"
                      />
                      <svg
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>

                    {/* Model Dropdown */}
                    {showModelDropdown && filteredModels.length > 0 && (
                      <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg z-10">
                        {filteredModels.map((model) => (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => {
                              setSelectedModel(model);
                              setModelSearchQuery('');
                              setShowModelDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 transition-colors ${
                              selectedModel?.id === model.id ? 'bg-emerald-50' : ''
                            }`}
                          >
                            <div className="font-medium text-slate-800">{model.name}</div>
                            <div className="text-slate-500 text-[10px] mt-0.5">
                              {model.model_id} · {model.provider_name}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Selected Model Display */}
                    {selectedModel && (
                      <div className="mt-2 p-3 rounded-lg bg-emerald-50/50 border border-emerald-200/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-semibold text-slate-800">
                              {selectedModel.name}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {selectedModel.model_id} · {selectedModel.provider_name}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedModel(null);
                              setModelSearchQuery('');
                              setShowModelDropdown(true);
                            }}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}

                    {models.length === 0 && (
                      <p className="mt-2 text-xs text-slate-400">
                        暂无启用的模型，请先在模型管理页面启用模型
                      </p>
                    )}

                    {showModelDropdown && filteredModels.length === 0 && modelSearchQuery && (
                      <div className="mt-2 p-3 rounded-lg border border-slate-200 bg-slate-50">
                        <p className="text-xs text-slate-500">未找到匹配的模型</p>
                      </div>
                    )}
                  </div>

                  {/* Test Button */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleTestGateway}
                        disabled={testing || !selectedModel}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-semibold rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                      >
                        {testing ? (
                          <>
                            <svg
                              className="animate-spin -ml-1 mr-2 h-3 w-3 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            测试中...
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-3 h-3 mr-1.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            测试连接
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setShowExampleConfig(!showExampleConfig)}
                        disabled={!selectedModel}
                        className="inline-flex items-center px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                      >
                        {showExampleConfig ? '隐藏' : '显示'}示例配置
                      </button>
                    </div>
                  </div>

                  {/* Example Config */}
                  {showExampleConfig && selectedModel && getExampleConfig() && (
                    <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-semibold text-slate-700">
                          示例配置 (JSON)
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const config = getExampleConfig();
                            if (config) {
                              navigator.clipboard.writeText(JSON.stringify(config, null, 2));
                              showToast('配置已复制到剪贴板', 'success');
                            }
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                        >
                          复制
                        </button>
                      </div>
                      <pre className="text-[10px] text-slate-700 overflow-x-auto bg-white p-3 rounded border border-slate-200">
                        {JSON.stringify(getExampleConfig(), null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Test Result */}
                  {testResult && (
                    <div className="mt-4 p-4 rounded-lg border border-slate-200 bg-slate-50">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-semibold text-slate-700">
                          测试结果
                        </label>
                        <span
                          className={`text-xs font-semibold ${
                            testResult.success ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {testResult.success ? '成功' : '失败'}
                        </span>
                      </div>
                      <pre className="text-[10px] text-slate-700 overflow-x-auto bg-white p-3 rounded border border-slate-200 max-h-64 overflow-y-auto">
                        {JSON.stringify(testResult, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
