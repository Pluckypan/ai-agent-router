'use client';

import { useState, useEffect } from 'react';
import Nav from '../components/Nav';
import { useToast } from '../components/ToastProvider';
import ConfirmDialog from '../components/ConfirmDialog';

interface Provider {
  id: number;
  name: string;
  protocol: string;
  base_url: string;
  api_key: string;
}

interface Model {
  id: number;
  provider_id: number;
  name: string;
  model_id: string;
  enabled: boolean;
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [testingProviderId, setTestingProviderId] = useState<number | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [testing, setTesting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    protocol: 'openai',
    base_url: '',
    api_key: '',
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadProviders();
    loadModels();
  }, []);

  const loadProviders = async () => {
    try {
      const res = await fetch('/api/providers');
      const data = await res.json();
      setProviders(data);
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      setModels(data);
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const loadProviderForEdit = async (id: number) => {
    try {
      const res = await fetch(`/api/providers?id=${id}&includeKey=true`);
      if (!res.ok) {
        throw new Error('Failed to load provider');
      }
      const data = await res.json();
      return data;
    } catch (error) {
      console.error('Failed to load provider for edit:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let response: Response;
      if (editing) {
        const updateData: any = {
          id: editing.id,
          name: formData.name,
          protocol: formData.protocol,
          base_url: formData.base_url,
        };
        if (formData.api_key && formData.api_key.trim() !== '') {
          updateData.api_key = formData.api_key.trim();
        }
        response = await fetch('/api/providers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });
      } else {
        if (!formData.api_key || formData.api_key.trim() === '') {
          showToast('API Key 不能为空', 'error');
          return;
        }
        response = await fetch('/api/providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            api_key: formData.api_key.trim(),
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || '保存失败';
        showToast(errorMessage, 'error');
        return;
      }

      setShowModal(false);
      setEditing(null);
      setFormData({ name: '', protocol: 'openai', base_url: '', api_key: '' });
      setShowApiKey(false);
      loadProviders();
      showToast('供应商保存成功', 'success');
    } catch (error: any) {
      console.error('Failed to save provider:', error);
      showToast('保存失败: ' + (error.message || '未知错误'), 'error');
    }
  };

  const handleEdit = async (provider: Provider) => {
    try {
      // Load provider with API key for editing
      const providerWithKey = await loadProviderForEdit(provider.id);
      setEditing(provider);
      setFormData({
        name: providerWithKey.name,
        protocol: providerWithKey.protocol,
        base_url: providerWithKey.base_url,
        api_key: providerWithKey.api_key || '', // Show existing key
      });
      setShowApiKey(false); // Start with hidden
      setShowModal(true);
    } catch (error) {
      console.error('Failed to load provider for edit:', error);
      showToast('加载供应商信息失败', 'error');
    }
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await fetch(`/api/providers?id=${deleteId}`, { method: 'DELETE' });
        loadProviders();
        showToast('供应商已删除', 'success');
      } catch (error) {
        console.error('Failed to delete provider:', error);
        showToast('删除失败', 'error');
      }
    }
    setShowConfirm(false);
    setDeleteId(null);
  };

  const handleTestConnection = (providerId: number) => {
    const providerModels = models.filter(m => m.provider_id === providerId);
    if (providerModels.length === 0) {
      showToast('该供应商下没有模型，请先添加或拉取模型', 'error');
      return;
    }
    setTestingProviderId(providerId);
    setSelectedModelId('');
    setSearchQuery('');
  };

  const startTest = async () => {
    if (!testingProviderId || !selectedModelId) {
      showToast('请选择要测试的模型', 'error');
      return;
    }

    setTesting(true);
    try {
      const res = await fetch('/api/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: testingProviderId,
          model_id: parseInt(selectedModelId),
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || '连接成功，模型可用', 'success');
      } else {
        showToast(data.error || '连接失败', 'error');
      }
    } catch (error: any) {
      console.error('Failed to test connection:', error);
      showToast('测试连接失败: ' + (error.message || '未知错误'), 'error');
    } finally {
      setTesting(false);
      setTestingProviderId(null);
      setSelectedModelId('');
    }
  };

  const cancelTest = () => {
    setTestingProviderId(null);
    setSelectedModelId('');
    setSearchQuery('');
  };

  const getProviderModels = (providerId: number) => {
    const providerModels = models.filter(m => m.provider_id === providerId);
    if (!searchQuery.trim()) {
      return providerModels;
    }
    const query = searchQuery.toLowerCase().trim();
    return providerModels.filter(model =>
      model.name.toLowerCase().includes(query) ||
      model.model_id.toLowerCase().includes(query)
    );
  };

  if (loading) {
    return (
      <>
        <Nav />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg">加载中...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-4 sm:px-0">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h1 className="text-lg font-bold text-slate-800">供应商管理</h1>
              <p className="text-xs text-slate-500 mt-1">管理 AI 模型供应商配置</p>
            </div>
            <button
              onClick={() => {
                setEditing(null);
                setFormData({ name: '', protocol: 'openai', base_url: '', api_key: '' });
                setShowApiKey(false);
                setShowModal(true);
              }}
              className="inline-flex items-center px-3.5 py-1.5 border border-transparent text-xs font-semibold rounded-lg shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500/50 transition-all duration-300"
            >
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              添加供应商
            </button>
          </div>

          <div className="bg-white/70 backdrop-blur-sm shadow-md rounded-2xl border border-emerald-100/50 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-emerald-50/30">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    名称
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    协议
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Base URL
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {providers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center">
                      <div className="text-slate-400">
                        <svg className="mx-auto h-10 w-10 mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <p className="text-xs text-slate-500">暂无供应商，请先添加供应商</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  providers.map((provider) => (
                    <tr key={provider.id} className="hover:bg-emerald-50/20 transition-colors duration-300">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs font-medium text-slate-800">{provider.name}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-emerald-100/80 text-emerald-700 border border-emerald-200/50">
                          {provider.protocol}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs text-slate-600 font-mono">{provider.base_url}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-medium">
                        <div className="flex items-center justify-end space-x-3">
                          <button
                            onClick={() => handleTestConnection(provider.id)}
                            className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-300"
                          >
                            测试连接
                          </button>
                          <button
                            onClick={() => handleEdit(provider)}
                            className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors duration-300"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDelete(provider.id)}
                            className="text-rose-500 hover:text-rose-600 font-medium transition-colors duration-300"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showModal && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full border border-emerald-100/50">
              <form onSubmit={handleSubmit} className="bg-white px-6 pt-5 pb-4 sm:p-6">
                <div className="mb-5">
                  <h3 className="text-base font-bold text-slate-800 mb-1">
                    {editing ? '编辑供应商' : '添加供应商'}
                  </h3>
                  <p className="text-xs text-slate-500">配置 AI 模型供应商信息</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">名称</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      autoComplete="off"
                      className="block w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs shadow-sm transition-all duration-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 focus:ring-offset-1"
                      placeholder="例如: OpenAI"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">协议</label>
                    <select
                      value={formData.protocol}
                      onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
                      autoComplete="off"
                      className="block w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs shadow-sm transition-all duration-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 focus:ring-offset-1"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="gemini">Gemini</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Base URL</label>
                    <input
                      type="url"
                      required
                      value={formData.base_url}
                      onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                      autoComplete="off"
                      className="block w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs shadow-sm transition-all duration-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 focus:ring-offset-1"
                      placeholder="https://api.openai.com/v1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      API Key
                      {editing && (
                        <span className="ml-1 text-[10px] text-slate-400 font-normal">(已保存，输入新值可更新)</span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        required={!editing}
                        value={formData.api_key}
                        onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                        autoComplete="new-password"
                        className="block w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 pr-9 text-xs shadow-sm transition-all duration-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 focus:ring-offset-1"
                        placeholder={editing ? '留空则不更新，输入新值可更新 API Key' : '输入 API Key'}
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
                </div>
                <div className="mt-5 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditing(null);
                    }}
                    className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400/30 transition-all duration-300"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 border border-transparent rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500/50 transition-all duration-300"
                  >
                    保存
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showConfirm}
        title="确认删除"
        message="确定要删除这个供应商吗？此操作不可恢复。"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowConfirm(false);
          setDeleteId(null);
        }}
        confirmText="删除"
        cancelText="取消"
        type="danger"
      />

      {/* Test Connection Modal */}
      {testingProviderId && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={cancelTest}></div>
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full border border-emerald-100/50">
              <div className="bg-white px-6 pt-5 pb-4 sm:p-6">
                <div className="mb-5">
                  <h3 className="text-base font-bold text-slate-800 mb-1">测试连接</h3>
                  <p className="text-xs text-slate-500">选择一个模型进行连接测试</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">搜索模型</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={testing}
                        autoComplete="off"
                        className="block w-full rounded-lg border border-slate-200 bg-white/80 pl-9 pr-3 py-2 text-xs shadow-sm transition-all duration-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="输入模型名称或ID进行搜索..."
                      />
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">选择模型</label>
                    <select
                      value={selectedModelId}
                      onChange={(e) => setSelectedModelId(e.target.value)}
                      disabled={testing}
                      className="block w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs shadow-sm transition-all duration-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">请选择模型</option>
                      {getProviderModels(testingProviderId).map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} ({model.model_id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={cancelTest}
                    disabled={testing}
                    className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={startTest}
                    disabled={testing || !selectedModelId}
                    className="px-4 py-1.5 border border-transparent rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
                  >
                    {testing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        测试中...
                      </>
                    ) : (
                      '开始测试'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
