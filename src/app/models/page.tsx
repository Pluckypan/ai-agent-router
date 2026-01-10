'use client';

import { useState, useEffect } from 'react';
import Nav from '../components/Nav';
import { useToast } from '../components/ToastProvider';
import ConfirmDialog from '../components/ConfirmDialog';

interface Model {
  id: number;
  provider_id: number;
  name: string;
  model_id: string;
  enabled: boolean;
  provider_name?: string;
  provider_protocol?: string;
}

interface Provider {
  id: number;
  name: string;
  protocol: string;
}

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFetchConfirm, setShowFetchConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [fetchProviderId, setFetchProviderId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    provider_id: '',
    name: '',
    model_id: '',
    enabled: true,
  });
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [modelsRes, providersRes] = await Promise.all([
        fetch('/api/models'),
        fetch('/api/providers'),
      ]);
      const modelsData = await modelsRes.json();
      const providersData = await providersRes.json();
      setModels(modelsData);
      setProviders(providersData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          provider_id: parseInt(formData.provider_id),
        }),
      });
      setShowModal(false);
      setFormData({ provider_id: '', name: '', model_id: '', enabled: true });
      loadData();
      showToast('模型添加成功', 'success');
    } catch (error) {
      console.error('Failed to save model:', error);
      showToast('保存失败', 'error');
    }
  };

  const handleToggleEnabled = async (id: number, enabled: boolean) => {
    try {
      await fetch('/api/models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled: !enabled }),
      });
      loadData();
    } catch (error) {
      console.error('Failed to update model:', error);
    }
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await fetch(`/api/models?id=${deleteId}`, { method: 'DELETE' });
        loadData();
        showToast('模型已删除', 'success');
      } catch (error) {
        console.error('Failed to delete model:', error);
        showToast('删除失败', 'error');
      }
    }
    setShowDeleteConfirm(false);
    setDeleteId(null);
  };

  const handleFetchModels = (providerId: number) => {
    setFetchProviderId(providerId);
    setShowFetchConfirm(true);
  };

  const confirmFetch = async () => {
    if (fetchProviderId) {
      try {
        const res = await fetch('/api/models', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider_id: fetchProviderId }),
        });
        const data = await res.json();
        showToast(`成功拉取 ${data.count} 个模型`, 'success');
        loadData();
      } catch (error: any) {
        console.error('Failed to fetch models:', error);
        showToast('拉取失败: ' + error.message, 'error');
      }
    }
    setShowFetchConfirm(false);
    setFetchProviderId(null);
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
              <h1 className="text-lg font-bold text-slate-800">模型管理</h1>
              <p className="text-xs text-slate-500 mt-1">管理 AI 模型配置和状态</p>
            </div>
            <button
              onClick={() => {
                setFormData({ provider_id: '', name: '', model_id: '', enabled: true });
                setShowModal(true);
              }}
              className="inline-flex items-center px-3.5 py-1.5 border border-transparent text-xs font-semibold rounded-lg shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500/50 transition-all duration-300"
            >
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              手动添加
            </button>
          </div>

          {/* 一键拉取模型列表 - 移到列表上方 */}
          <div className="mb-5 bg-white/70 backdrop-blur-sm shadow-md rounded-2xl border border-emerald-100/50 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-800">一键拉取模型列表</h2>
                <p className="text-xs text-slate-500 mt-0.5">从供应商 API 自动拉取可用模型</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {providers.map((provider) => (
                <div key={provider.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:border-emerald-300 hover:shadow-sm transition-all duration-300 cursor-pointer bg-white/80 backdrop-blur-sm">
                  <div className="flex-1">
                    <div className="font-semibold text-xs text-slate-800">{provider.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{provider.protocol}</div>
                  </div>
                  <button
                    onClick={() => handleFetchModels(provider.id)}
                    className="ml-3 inline-flex items-center px-2.5 py-1 border border-transparent text-[10px] font-semibold rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all duration-300"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    拉取
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm shadow-md rounded-2xl border border-emerald-100/50 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-emerald-50/30">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    名称
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    模型 ID
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    供应商
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {models.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <div className="text-slate-400">
                        <svg className="mx-auto h-10 w-10 mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="text-xs text-slate-500">暂无模型，请先添加或拉取模型</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  models.map((model) => (
                    <tr key={model.id} className="hover:bg-emerald-50/20 transition-colors duration-300">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs font-medium text-slate-800">{model.name}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs text-slate-600 font-mono">{model.model_id}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs text-slate-600">
                          <span className="font-medium">{model.provider_name}</span>
                          <span className="text-slate-400 ml-1">({model.provider_protocol})</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full border ${
                          model.enabled 
                            ? 'bg-emerald-100/80 text-emerald-700 border-emerald-200/50' 
                            : 'bg-slate-100/80 text-slate-600 border-slate-200/50'
                        }`}>
                          {model.enabled ? '启用' : '禁用'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-medium">
                        <div className="flex items-center justify-end space-x-3">
                          <button
                            onClick={() => handleToggleEnabled(model.id, model.enabled)}
                            className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors duration-300"
                          >
                            {model.enabled ? '禁用' : '启用'}
                          </button>
                          <button
                            onClick={() => handleDelete(model.id)}
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
                  <h3 className="text-base font-bold text-slate-800 mb-1">添加模型</h3>
                  <p className="text-xs text-slate-500">手动添加新的 AI 模型</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">供应商</label>
                    <select
                      required
                      value={formData.provider_id}
                      onChange={(e) => setFormData({ ...formData, provider_id: e.target.value })}
                      autoComplete="off"
                      className="block w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs shadow-sm transition-all duration-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 focus:ring-offset-1"
                    >
                      <option value="">选择供应商</option>
                      {providers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">名称</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      autoComplete="off"
                      className="block w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs shadow-sm transition-all duration-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 focus:ring-offset-1"
                      placeholder="例如: GPT-4"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">模型 ID</label>
                    <input
                      type="text"
                      required
                      value={formData.model_id}
                      onChange={(e) => setFormData({ ...formData, model_id: e.target.value })}
                      autoComplete="off"
                      className="block w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs shadow-sm transition-all duration-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 focus:ring-offset-1"
                      placeholder="例如: gpt-4"
                    />
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
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
        open={showDeleteConfirm}
        title="确认删除"
        message="确定要删除这个模型吗？此操作不可恢复。"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeleteId(null);
        }}
        confirmText="删除"
        cancelText="取消"
        type="danger"
      />

      <ConfirmDialog
        open={showFetchConfirm}
        title="拉取模型列表"
        message="确定要从供应商拉取模型列表吗？"
        onConfirm={confirmFetch}
        onCancel={() => {
          setShowFetchConfirm(false);
          setFetchProviderId(null);
        }}
        confirmText="拉取"
        cancelText="取消"
        type="info"
      />
    </>
  );
}
