'use client';

import { useState, useEffect, useRef } from 'react';
import Nav from '../components/Nav';
import { useToast } from '../components/ToastProvider';

interface Model {
  id: number;
  name: string;
  model_id: string;
}

interface ConfigStatus {
  applied: boolean;
  modelMapping: {
    haiku?: string;
    sonnet?: string;
    opus?: string;
    default?: string;
    reasoning?: string;
  };
  gatewayAddress?: string;
  apiKey?: string;
  lastUpdated?: string;
  backupExists: boolean;
  matchCurrentGateway?: boolean;
  routerProvider?: string; // 路由提供者标识，'aar' 表示配置来自当前工具
  tempMapping?: {
    haiku?: string;
    sonnet?: string;
    opus?: string;
    default?: string;
    reasoning?: string;
  }; // 临时配置模型映射
}

interface ModelMappingInput {
  key: string;
  label: string;
  envKey: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}

export default function IDEConfigPage() {
  const [activeTab, setActiveTab] = useState('claude');
  const [haikuModel, setHaikuModel] = useState('GLM-4.5-air');
  const [sonnetModel, setSonnetModel] = useState('MiniMax-M2.1');
  const [opusModel, setOpusModel] = useState('GLM-4.7');
  const [defaultModel, setDefaultModel] = useState('GLM-4.7');
  const [reasoningModel, setReasoningModel] = useState('GLM-4.7');
  const [enabled, setEnabled] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [models, setModels] = useState<Record<string, Model[]>>({});
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<null | any>(null);
  const { showToast } = useToast();

  // Abort controller for cancelling test
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadStatus = async () => {
    try {
      const res = await fetch('/api/ide/claude/status');
      const data: ConfigStatus = await res.json();
      setStatus(data);
      // 优先使用临时配置（如果存在），否则使用已应用的配置
      const mappingToUse = (data.matchCurrentGateway === false && data.tempMapping)
        ? data.tempMapping
        : data.modelMapping;
      if (mappingToUse) {
        setHaikuModel(mappingToUse.haiku || 'GLM-4.5-air');
        setSonnetModel(mappingToUse.sonnet || 'MiniMax-M2.1');
        setOpusModel(mappingToUse.opus || 'GLM-4.7');
        setDefaultModel(mappingToUse.default || 'GLM-4.7');
        setReasoningModel(mappingToUse.reasoning || 'GLM-4.7');
      }
      // 只有当配置来自当前工具（routerProvider === 'aar'）时才设置为 enabled
      setEnabled(data.applied && data.routerProvider === 'aar');
    } catch (error) {
      console.error('Failed to load status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async () => {
    try {
      const res = await fetch('/api/ide/claude/available-models');
      const data = await res.json();
      setModels(data.models || {});
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  useEffect(() => {
    loadStatus();
    loadModels();
  }, []);

  const handleApply = async () => {
    setApplying(true);
    try {
      const res = await fetch('/api/ide/claude/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          haiku: haikuModel,
          sonnet: sonnetModel,
          opus: opusModel,
          default: defaultModel,
          reasoning: reasoningModel,
        }),
      });
      const data = await res.json();

      if (data.success) {
        showToast('配置应用成功', 'success');
        await loadStatus();
      } else {
        showToast('应用失败: ' + (data.error || '未知错误'), 'error');
      }
    } catch (error) {
      console.error('Failed to apply config:', error);
      showToast('应用失败: 网络错误', 'error');
    } finally {
      setApplying(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const res = await fetch('/api/ide/claude/restore', {
        method: 'POST',
      });
      const data = await res.json();
      
      if (data.success) {
        showToast('配置已还原', 'success');
        await loadStatus();
      } else {
        showToast('还原失败: ' + (data.error || '未知错误'), 'error');
      }
    } catch (error) {
      console.error('Failed to restore config:', error);
      showToast('还原失败: 网络错误', 'error');
    } finally {
      setRestoring(false);
    }
  };

  const handleTest = async () => {
    // Cancel any ongoing test
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    abortControllerRef.current = new AbortController();
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/ide/claude/test', {
        signal: abortControllerRef.current.signal,
      });
      const data = await res.json();

      setTestResult(data);

      if (data.success) {
        showToast('配置测试通过', 'success');
      } else {
        showToast('配置验证失败: ' + (data.error || data.suggestion || '请检查配置'), 'error');
      }
    } catch (error: any) {
      console.error('Failed to test config:', error);
      if (error.name === 'AbortError') {
        showToast('测试已取消', 'info');
      } else {
        showToast('测试失败: 网络错误', 'error');
        setTestResult({ error: 'Network error' });
      }
    } finally {
      if (abortControllerRef.current?.signal.aborted === false) {
        abortControllerRef.current = null;
      }
      setTesting(false);
    }
  };

  const handleCancelTest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/ide/claude/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          haiku: haikuModel,
          sonnet: sonnetModel,
          opus: opusModel,
          default: defaultModel,
          reasoning: reasoningModel,
        }),
      });
      const data = await res.json();

      if (data.success) {
        const isTemp = data.saveType === 'temp';
        showToast(isTemp ? '配置已保存（临时）' : '配置已更新到 Claude Code', 'success');
        await loadStatus();
      } else {
        showToast('保存失败: ' + (data.error || '未知错误'), 'error');
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      showToast('保存失败: 网络错误', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/80">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
          <div className="text-xs font-medium text-slate-500">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/80">
      <Nav />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">IDE 配置</h1>
            <span className="px-2.5 py-0.5 text-xs font-medium text-slate-600 bg-slate-100/80 rounded-full border border-slate-200/50">
              v1.0
            </span>
          </div>
          <p className="text-sm text-slate-500">配置 Claude Code 和 Cursor 的模型代理设置</p>
        </div>

        <div className="bg-white/60 backdrop-blur-md rounded-xl border border-slate-200/50 shadow-sm">
          <div className="border-b border-slate-200/50 bg-white/40">
            <nav className="flex gap-1 px-5" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('claude')}
                className={`relative px-4 py-3.5 text-sm font-medium transition-all duration-200 ${
                  activeTab === 'claude'
                    ? 'text-slate-900'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Claude Code
                {activeTab === 'claude' && (
                  <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-slate-900 rounded-full"></span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('cursor')}
                disabled
                className="relative px-4 py-3.5 text-sm font-medium text-slate-300 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2">
                  Cursor
                  <span className="px-2 py-0.5 text-[10px] font-medium text-slate-400 bg-slate-100/60 rounded-full border border-slate-200/50">
                    即将推出
                  </span>
                </div>
              </button>
            </nav>
          </div>

          <div className="p-5 sm:p-6">
            {activeTab === 'claude' && (
              <div className="space-y-6">
                {status && (
                  <div className="flex items-center justify-between py-3 px-4 bg-white/60 rounded-lg border border-slate-200/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        status.applied
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        {status.applied ? (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                          </svg>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-medium text-slate-700">
                          {status.applied ? '已配置' : '未配置'}
                        </span>
                        {status.applied && status.matchCurrentGateway !== undefined && (
                          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                            status.matchCurrentGateway
                              ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200/60'
                              : 'bg-amber-50/80 text-amber-700 border-amber-200/60'
                          }`}>
                            {status.matchCurrentGateway ? '匹配当前网关' : '不匹配'}
                          </span>
                        )}
                      </div>
                    </div>
                    {status.lastUpdated && (
                      <div className="text-[11px] text-slate-400 font-mono">
                        {new Date(status.lastUpdated).toLocaleString('zh-CN', {
                          month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <h2 className="text-[11px] font-medium text-slate-400 mb-5">模型映射</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      {
                        key: 'haiku',
                        label: 'Haiku',
                        icon: (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        ),
                        description: '快速响应',
                        value: haikuModel,
                        onChange: setHaikuModel,
                      },
                      {
                        key: 'sonnet',
                        label: 'Sonnet',
                        icon: (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        ),
                        description: '平衡性能',
                        value: sonnetModel,
                        onChange: setSonnetModel,
                      },
                      {
                        key: 'opus',
                        label: 'Opus',
                        icon: (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 5.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        ),
                        description: '深度思考',
                        value: opusModel,
                        onChange: setOpusModel,
                      },
                      {
                        key: 'default',
                        label: '默认',
                        icon: (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                        ),
                        description: '主要模型',
                        value: defaultModel,
                        onChange: setDefaultModel,
                      },
                      {
                        key: 'reasoning',
                        label: '推理',
                        icon: (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 14.9a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 1.414l-5-5A2 2 0 009 10.172V5L8 4z" />
                          </svg>
                        ),
                        description: '复杂推理',
                        value: reasoningModel,
                        onChange: setReasoningModel,
                      },
                    ].map((config) => (
                      <div
                        key={config.key}
                        className="group relative bg-gradient-to-br from-white/50 to-transparent hover:from-slate-50/60 rounded-xl border border-slate-200/50 p-4 transition-all duration-300 hover:border-slate-300/60 hover:shadow-sm"
                      >
                        <label
                          htmlFor={config.key}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 mb-2.5 relative group/tip">
                            <div className="w-7 h-7 rounded-lg bg-slate-100/80 text-slate-600 flex items-center justify-center">
                              {config.icon}
                            </div>
                            <div className="flex items-center gap-2.5">
                              <span className="text-[11px] font-medium text-slate-700">{config.label}</span>
                            </div>
                            <div className="absolute left-9 top-0 mt-8 w-28 rounded-lg bg-slate-900/95 backdrop-blur-md px-3 py-2 text-[10px] text-slate-200 shadow-xl opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all duration-200 z-10">
                              {config.description}
                            </div>
                          </div>

                          <div className="relative">
                            <select
                              id={config.key}
                              value={config.value}
                              onChange={(e) => config.onChange(e.target.value)}
                              className="w-full appearance-none rounded-lg border border-slate-200/80 bg-white/90 backdrop-blur-sm px-3 py-2 pr-7 text-[11px] font-medium text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300/80 hover:bg-white focus:border-slate-400/80 focus:ring-2 focus:ring-slate-200/50 focus:outline-none cursor-pointer"
                            >
                              {Object.entries(models).map(([provider, providerModels]) => (
                                <optgroup key={provider} label={provider}>
                                  {providerModels.map((model) => (
                                    <option key={model.id} value={model.model_id}>
                                      {model.name}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                              <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>

                          <p className="text-[10px] text-slate-500 mt-2.5 group-hover:text-slate-600 transition-colors">
                            {config.description}
                          </p>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-1">
                  <button
                    onClick={enabled ? handleRestore : handleApply}
                    disabled={applying || restoring}
                    className={`w-full px-4 py-2.5 text-xs font-medium rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                      enabled
                        ? 'bg-white border-slate-200/80 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        : 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {applying ? (
                      <>
                        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {enabled ? '还原中' : '应用中'}
                      </>
                    ) : (
                      <>
                        {enabled ? (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {enabled ? '还原配置' : '应用配置'}
                      </>
                    )}
                  </button>

                  {testing ? (
                    <button
                      onClick={handleCancelTest}
                      className="w-full px-4 py-2.5 text-xs font-medium rounded-lg border border-amber-200/80 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      取消测试
                    </button>
                  ) : (
                    <button
                      onClick={handleTest}
                      className="w-full px-4 py-2.5 text-xs font-medium rounded-lg border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      测试配置
                    </button>
                  )}

                  {enabled ? (
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="w-full px-4 py-2.5 text-xs font-medium rounded-lg border border-emerald-200/80 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          保存中
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                            <polyline points="17 21 17 13 7 13 7 21" />
                          </svg>
                          保存配置
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="w-full px-4 py-2.5 text-xs font-medium rounded-lg border border-indigo-200/80 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          保存中
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                            <polyline points="17 21 17 13 7 13 7 21" />
                          </svg>
                          保存配置
                        </>
                      )}
                    </button>
                  )}
                </div>

                {testResult && (
                  <div className={`rounded-lg border px-4 py-3 ${
                    testResult.success
                      ? 'bg-emerald-50/60 border-emerald-200/60'
                      : 'bg-rose-50/60 border-rose-200/60'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        testResult.success ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}>
                        {testResult.success ? (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium mb-1">
                          {testResult.success ? '配置验证成功' : '配置验证失败'}
                        </div>
                        <p className={`text-[11px] ${testResult.success ? 'text-emerald-700/80' : 'text-rose-700/80'}`}>
                          {testResult.success ? 'Claude Code 可以正常工作' : '请检查配置'}
                        </p>

                        {testResult.checks && (
                          <div className="mt-3 pt-3 border-t border-white/40">
                            <div className="grid grid-cols-3 gap-2">
                              {Object.entries(testResult.checks).map(([key, value]) => {
                                const labels: Record<string, string> = {
                                  hasBaseUrl: '网关',
                                  hasApiKey: 'API Key',
                                  hasHaikuModel: 'Haiku',
                                  hasSonnetModel: 'Sonnet',
                                  hasOpusModel: 'Opus',
                                  hasDefaultModel: '默认模型',
                                  hasReasoningModel: '推理模型',
                                  isFromAar: '来源'
                                };
                                return (
                                  <div key={key} className="flex items-center gap-1.5">
                                    {value ? (
                                      <svg className="w-3 h-3 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : (
                                      <svg className="w-3 h-3 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    )}
                                    <span className="text-[10px] text-slate-600">{labels[key] || key}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {testResult.claudeTest && (
                          <div className="mt-3 pt-3 border-t border-white/40">
                            {testResult.claudeTest.success ? (
                              <p className="text-[10px] text-emerald-700">
                                {testResult.claudeTest.message}
                                {testResult.claudeTest.output && (
                                  <span className="text-[10px] text-slate-500 ml-1.5">输出: {testResult.claudeTest.output}</span>
                                )}
                              </p>
                            ) : (
                              <p className="text-[10px] text-rose-700 font-mono bg-rose-100/50 px-2 py-1 rounded inline-block">
                                {testResult.claudeTest.error}
                              </p>
                            )}
                          </div>
                        )}

                        {testResult.configSummary && (
                          <details className="mt-3 group">
                            <summary className="cursor-pointer text-[10px] text-slate-500 hover:text-slate-700 list-none flex items-center gap-1">
                              <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              配置详情
                            </summary>
                            <div className="mt-2 space-y-1.5 text-[10px]">
                              <div className="flex justify-between py-1 border-b border-slate-200/40">
                                <span className="text-slate-500">网关</span>
                                <span className="font-mono text-slate-700">{testResult.configSummary.baseUrl}</span>
                              </div>
                              <div className="flex justify-between py-1 border-b border-slate-200/40">
                                <span className="text-slate-500">API Key</span>
                                <span className="font-mono text-slate-700">{testResult.configSummary.apiKey}</span>
                              </div>
                              {testResult.configSummary.routerProvider && (
                                <div className="flex justify-between py-1 border-b border-slate-200/40">
                                  <span className="text-slate-500">来源</span>
                                  <span className="text-slate-700">
                                    {testResult.configSummary.routerProvider === 'aar' ? '当前工具' : testResult.configSummary.routerProvider}
                                  </span>
                                </div>
                              )}
                              {testResult.configSummary.haikuModel !== 'not set' && (
                                <div className="flex justify-between py-1 border-b border-slate-200/40">
                                  <span className="text-slate-500">Haiku</span>
                                  <span className="font-mono text-slate-700">{testResult.configSummary.haikuModel}</span>
                                </div>
                              )}
                              {testResult.configSummary.sonnetModel !== 'not set' && (
                                <div className="flex justify-between py-1 border-b border-slate-200/40">
                                  <span className="text-slate-500">Sonnet</span>
                                  <span className="font-mono text-slate-700">{testResult.configSummary.sonnetModel}</span>
                                </div>
                              )}
                              {testResult.configSummary.opusModel !== 'not set' && (
                                <div className="flex justify-between py-1">
                                  <span className="text-slate-500">Opus</span>
                                  <span className="font-mono text-slate-700">{testResult.configSummary.opusModel}</span>
                                </div>
                              )}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <details className="group">
                  <summary className="cursor-pointer text-[11px] text-slate-500 hover:text-slate-700 list-none flex items-center gap-1.5 py-1">
                    <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span>配置预览</span>
                  </summary>
                  <div className="mt-3">
                    <div className="relative overflow-hidden rounded-lg bg-slate-950 border border-slate-800">
                      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border-b border-slate-800">
                        <div className="flex gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                        </div>
                        <span className="text-[10px] font-medium text-slate-400 ml-2">settings.json</span>
                      </div>
                      <pre className="p-3.5 text-[10px] text-slate-300 font-mono overflow-x-auto bg-slate-950">
                        {JSON.stringify(
                          {
                            router_provider: 'aar',
                            env: {
                              ANTHROPIC_AUTH_TOKEN: status?.apiKey && status.apiKey !== 'your-gateway-api-key'
                                ? '****' + status.apiKey.slice(-8)
                                : 'your-gateway-api-key',
                              ANTHROPIC_BASE_URL: status?.gatewayAddress || 'http://localhost:3000',
                              ANTHROPIC_DEFAULT_HAIKU_MODEL: haikuModel,
                              ANTHROPIC_DEFAULT_SONNET_MODEL: sonnetModel,
                              ANTHROPIC_DEFAULT_OPUS_MODEL: opusModel,
                              ANTHROPIC_MODEL: defaultModel,
                              ANTHROPIC_REASONING_MODEL: reasoningModel,
                              API_TIMEOUT_MS: '3000000',
                              CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 1,
                              hasCompletedOnboarding: true,
                            },
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </div>
                </details>

                <div className="rounded-lg border border-slate-200/50 bg-slate-50/60 px-4 py-3">
                  <div className="flex items-center gap-2 mb-2.5">
                    <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-xs font-semibold text-slate-700">使用说明</h3>
                  </div>
                  <ul className="space-y-1.5 text-[10px] text-slate-600">
                    <li className="flex gap-2">
                      <span className="text-slate-400">1.</span>
                      <span>为每个模型类别选择对应的路由模型</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">2.</span>
                      <span>下方配置预览会实时更新</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">3.</span>
                      <span>点击"保存配置"可临时保存当前选择</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">4.</span>
                      <span>点击"应用配置"将设置写入 Claude Code</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">5.</span>
                      <span>配置文件位于 ~/.claude/settings.json</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">6.</span>
                      <span>临时配置保存在 ~/.aar/settings.tmp.json</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">7.</span>
                      <span>点击"还原配置"可恢复到应用前的状态</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
