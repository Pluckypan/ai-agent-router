'use client';

import { useState, useEffect } from 'react';
import Nav from './components/Nav';
import { useToast } from './components/ToastProvider';

interface Config {
  port?: string;
  api_key?: string;
}

export default function Home() {
  const [config, setConfig] = useState<Config>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'stopped' | 'running'>('stopped');
  const { showToast } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      setConfig({
        port: data.port || '3000',
        api_key: data.api_key || '',
      });
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
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
                    placeholder="3000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    API Key (可选)
                  </label>
                  <input
                    type="password"
                    value={config.api_key}
                    onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                    autoComplete="new-password"
                    className="block w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs shadow-sm transition-all duration-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 focus:ring-offset-1"
                    placeholder="留空则不验证"
                  />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div>
                    <span className="text-xs text-slate-500">状态: </span>
                    <span className={`text-xs font-medium ${status === 'running' ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {status === 'running' ? '运行中' : '已停止'}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={saveConfig}
                      disabled={saving}
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
                      onClick={() => setStatus(status === 'running' ? 'stopped' : 'running')}
                      className={`inline-flex items-center px-3.5 py-1.5 border border-transparent text-xs font-semibold rounded-lg shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all duration-300 ${
                        status === 'running'
                          ? 'bg-rose-500 hover:bg-rose-600 focus:ring-rose-500/50'
                          : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/50'
                      }`}
                    >
                      {status === 'running' ? (
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
        </div>
      </main>
    </div>
  );
}
