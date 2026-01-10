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

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    protocol: 'openai',
    base_url: '',
    api_key: '',
  });
  const { showToast } = useToast();

  useEffect(() => {
    loadProviders();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await fetch('/api/providers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, id: editing.id }),
        });
      } else {
        await fetch('/api/providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }
      setShowModal(false);
      setEditing(null);
      setFormData({ name: '', protocol: 'openai', base_url: '', api_key: '' });
      loadProviders();
      showToast('供应商保存成功', 'success');
    } catch (error) {
      console.error('Failed to save provider:', error);
      showToast('保存失败', 'error');
    }
  };

  const handleEdit = (provider: Provider) => {
    setEditing(provider);
    setFormData({
      name: provider.name,
      protocol: provider.protocol,
      base_url: provider.base_url,
      api_key: '', // Don't show existing key
    });
    setShowModal(true);
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
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">API Key</label>
                    <input
                      type="password"
                      required={!editing}
                      value={formData.api_key}
                      onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                      autoComplete="new-password"
                      className="block w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs shadow-sm transition-all duration-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 focus:ring-offset-1"
                      placeholder={editing ? '留空则不更新' : '输入 API Key'}
                    />
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
    </>
  );
}
