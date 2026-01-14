'use client';

import { useState, useEffect } from 'react';
import Nav from '../components/Nav';
import { useToast } from '../components/ToastProvider';

interface Model {
  id: number;
  name: string;
  model_id: string;
}

interface ConfigStatus {
  applied: boolean;
  modelMapping: { haiku?: string; sonnet?: string; opus?: string };
  gatewayAddress?: string;
  lastUpdated?: string;
  backupExists: boolean;
}

export default function IDEConfigPage() {
  const [activeTab, setActiveTab] = useState('claude');
  const [haikuModel, setHaikuModel] = useState('GLM-4.5-air');
  const [sonnetModel, setSonnetModel] = useState('MiniMax-M2.1');
  const [opusModel, setOpusModel] = useState('GLM-4.7');
  const [enabled, setEnabled] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [models, setModels] = useState<Record<string, Model[]>>({});
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const loadStatus = async () => {
    try {
      const res = await fetch('/api/ide/claude/status');
      const data: ConfigStatus = await res.json();
      setStatus(data);
      if (data.applied && data.modelMapping) {
        setHaikuModel(data.modelMapping.haiku || 'GLM-4.5-air');
        setSonnetModel(data.modelMapping.sonnet || 'MiniMax-M2.1');
        setOpusModel(data.modelMapping.opus || 'GLM-4.7');
        setEnabled(true);
      }
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
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        showToast('配置应用成功', 'success');
        setEnabled(true);
        await loadStatus();
      } else {
        showToast("应用失败: " + (data.error || '未知错误'), 'error');
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
        showToast("还原失败: " + (data.error || '未知错误'), 'error');
      }
    } catch (error) {
      console.error('Failed to restore config:', error);
      showToast('还原失败: 网络错误', 'error');
    } finally {
      setRestoring(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-white to-slate-50/50">
      <Nav />

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-4 sm:px-0">
          <div className="bg-white/70 backdrop-blur-sm shadow-md rounded-2xl border border-blue-100/50">
            <div className="px-6 py-5 sm:p-6">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 mb-1">IDE 配置</h1>
                <p className="text-sm text-slate-500">配置 Claude Code 和 Cursor 的模型代理设置</p>
              </div>

              <div className="mb-6">
                <div className="flex border-b border-slate-200">
                  <button
                    onClick={() => setActiveTab('claude')}
                    className={
                      activeTab === 'claude' 
                        ? 'px-6 py-3 text-sm font-semibold border-b-2 border-blue-600 text-blue-600' 
                        : 'px-6 py-3 text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-700'
                    }
                  >
                    Claude Code
                  </button>
                  <button
                    onClick={() => setActiveTab('cursor')}
                    disabled
                    className="px-6 py-3 text-sm font-semibold border-b-2 border-transparent text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cursor
                    <span className="ml-2 text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                      即将推出
                    </span>
                  </button>
                </div>
              </div>

              {activeTab === 'claude' && (
                <div className="space-y-6">
                  {status && (
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-500">状态: </span>
                          <span className={'text-xs font-medium ' + (status.applied ? 'text-emerald-600' : 'text-slate-500')}>
                            {status.applied ? '已应用' : '未配置'}
                          </span>
                        </div>
                        {status.lastUpdated && (
                          <div className="text-xs text-slate-400">
                            最后更新: {new Date(status.lastUpdated).toLocaleString('zh-CN')}
                          </div>
                        )}
                      </div>
                      {status.gatewayAddress && (
                        <div className="mt-2 text-xs text-slate-500">
                          网关地址: {status.gatewayAddress}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Haiku 模型 (快速响应)
                      </label>
                      <select
                        value={haikuModel}
                        onChange={(e) => setHaikuModel(e.target.value)}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                      >
                        {Object.entries(models).map(([provider, providerModels]) => (
                          <optgroup key={provider} label={provider}>
                            {providerModels.map((model) => (
                              <option key={model.id} value={model.model_id}>
                                {model.name} ({model.model_id})
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Sonnet 模型 (平衡)
                      </label>
                      <select
                        value={sonnetModel}
                        onChange={(e) => setSonnetModel(e.target.value)}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                      >
                        {Object.entries(models).map(([provider, providerModels]) => (
                          <optgroup key={provider} label={provider}>
                            {providerModels.map((model) => (
                              <option key={model.id} value={model.model_id}>
                                {model.name} ({model.model_id})
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Opus 模型 (强大)
                      </label>
                      <select
                        value={opusModel}
                        onChange={(e) => setOpusModel(e.target.value)}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                      >
                        {Object.entries(models).map(([provider, providerModels]) => (
                          <optgroup key={provider} label={provider}>
                            {providerModels.map((model) => (
                              <option key={model.id} value={model.model_id}>
                                {model.name} ({model.model_id})
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">
                        启用 Claude Code 代理
                      </div>
                      <div className="text-xs text-slate-500">
                        将配置应用到 Claude Code IDE
                      </div>
                    </div>
                    <button
                      onClick={enabled ? handleRestore : handleApply}
                      disabled={applying || restoring}
                      className={
                        enabled
                          ? 'inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-semibold rounded-lg shadow-sm text-white bg-rose-500 hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                          : 'inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-semibold rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                      }
                    >
                      {applying ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          应用中
                        </>
                      ) : restoring ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          还原中
                        </>
                      ) : enabled ? (
                        '还原配置'
                      ) : (
                        '应用配置'
                      )}
                    </button>
                  </div>

                  <div>
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className="flex items-center text-sm text-slate-600 hover:text-slate-800 transition-colors"
                    >
                      <svg
                        className={'w-4 h-4 mr-2 transform transition-transform ' + (showPreview ? 'rotate-90' : '')}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                      {showPreview ? '隐藏' : '显示'}配置预览
                    </button>
                  </div>

                  {showPreview && (
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="mb-2">
                        <label className="block text-sm font-semibold text-slate-700">
                          生成的配置 (JSON)
                        </label>
                      </div>
                      <pre className="text-xs text-slate-700 overflow-x-auto bg-white p-3 rounded border border-slate-200 max-h-80 overflow-y-auto">
                        {JSON.stringify(
                          {
                            env: {
                              ANTHROPIC_AUTH_TOKEN: 'your-gateway-api-key',
                              ANTHROPIC_BASE_URL: status?.gatewayAddress || 'http://localhost:3000',
                              ANTHROPIC_DEFAULT_HAIKU_MODEL: haikuModel,
                              ANTHROPIC_DEFAULT_SONNET_MODEL: sonnetModel,
                              ANTHROPIC_DEFAULT_OPUS_MODEL: opusModel,
                              ANTHROPIC_MODEL: opusModel,
                              ANTHROPIC_REASONING_MODEL: opusModel,
                            },
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  )}

                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="text-sm font-semibold text-amber-800 mb-2">
                      使用说明
                    </div>
                    <ul className="text-xs text-amber-700 space-y-1.5">
                      <li>• 选择 Haiku、Sonnet、Opus 对应的模型</li>
                      <li>• 点击"应用配置"将设置写入 Claude Code</li>
                      <li>• 配置文件位于 ~/.claude/settings.json</li>
                      <li>• 原有配置会自动备份为 settings.json.aar.bak</li>
                      <li>• 点击"还原配置"可恢复到应用前的状态</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
