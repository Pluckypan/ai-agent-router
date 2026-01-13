'use client';

import { useState, useEffect } from 'react';
import Nav from '../components/Nav';
import { useToast } from '../components/ToastProvider';
import ConfirmDialog from '../components/ConfirmDialog';

interface RequestLog {
  id: number;
  model_id: number;
  model_name?: string;
  provider_name?: string;
  request_method: string;
  request_path: string;
  request_headers: string;
  request_query: string;
  request_body: string;
  response_status: number;
  response_body: string;
  response_time_ms: number;
  created_at: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const limit = 50;
  const { showToast } = useToast();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('已复制到剪贴板', 'success');
    } catch {
      showToast('复制失败，请手动复制', 'error');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    setConfirmDialog({
      open: true,
      title: '删除确认',
      message: `确定要删除选中的 ${selectedIds.length} 条日志吗？`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/logs?ids=${selectedIds.join(',')}`, { method: 'DELETE' });
          const data = await res.json();
          if (res.ok) {
            setSelectedIds([]);
            setSelectAll(false);
            loadLogs();
            showToast('删除成功', 'success');
            setConfirmDialog(null);
          } else {
            showToast('删除失败：' + (data.error || '未知错误'), 'error');
          }
        } catch (error) {
          console.error('Failed to delete logs:', error);
          showToast('删除失败', 'error');
        }
      },
    });
  };

  const handleClearAll = async () => {
    setConfirmDialog({
      open: true,
      title: '清空日志',
      message: '确定要清空所有日志吗？此操作不可恢复！',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/logs?clear_all=true', { method: 'DELETE' });
          const data = await res.json();
          if (res.ok) {
            setPage(0);
            setSelectedIds([]);
            setSelectAll(false);
            loadLogs();
            showToast('清空成功', 'success');
            setConfirmDialog(null);
          } else {
            showToast('清空失败：' + (data.error || '未知错误'), 'error');
          }
        } catch (error) {
          console.error('Failed to clear logs:', error);
          showToast('清空失败', 'error');
        }
      },
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setSelectedIds(checked ? logs.map(log => log.id) : []);
  };

  const handleSelectLog = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
      setSelectAll(false);
    }
  };

  const loadLogs = async () => {
    try {
      const res = await fetch(`/api/logs?limit=${limit}&offset=${page * limit}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page, limit]);

  const formatJSON = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonString;
    }
  };

  const parseModelFromRequest = (query: string, body: string): string | null => {
    try {
      const parsedQuery = query ? JSON.parse(query) : {};
      const parsedBody = body ? JSON.parse(body) : {};

      const model = parsedBody.model || parsedQuery.model;

      // 处理可能为数组的情况（如 message 格式）
      if (Array.isArray(model)) {
        const lastMessage = model[model.length - 1];
        if (lastMessage && typeof lastMessage === 'object' && 'model' in lastMessage) {
          return lastMessage.model;
        }
      }

      return typeof model === 'string' ? model : null;
    } catch {
      return null;
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 400 && status < 500) return 'text-yellow-600';
    if (status >= 500) return 'text-red-600';
    return 'text-gray-600';
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
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-800">请求日志</h1>
              <p className="text-xs text-slate-500 mt-1">查看所有 API 请求记录和响应详情</p>
            </div>
            <div className="flex gap-2">
              {selectedIds.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg border border-rose-200 transition-all duration-300"
                >
                  删除选中 ({selectedIds.length})
                </button>
              )}
              <button
                onClick={handleClearAll}
                className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg border border-slate-200 transition-all duration-300"
              >
                清空所有
              </button>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm shadow-md rounded-2xl border border-emerald-100/50 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-emerald-50/30">
                <tr>
                  <th className="px-4 py-3.5 w-10">
                    <input
                      type="checkbox"
                      checked={selectAll && logs.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    时间
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    模型
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    方法
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    路径
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    响应时间
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <div className="text-slate-400">
                        <svg className="mx-auto h-10 w-10 mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-xs text-slate-500">暂无日志记录</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const parsedModel = parseModelFromRequest(log.request_query, log.request_body);
                    const displayModel = parsedModel || log.model_name || 'Gateway';

                    return (
                      <tr key={log.id} className="hover:bg-emerald-50/20 transition-colors duration-300">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(log.id)}
                            onChange={(e) => handleSelectLog(log.id, e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-xs text-slate-600">
                            {new Date(log.created_at).toLocaleString('zh-CN')}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-xs">
                            <div className="font-medium text-slate-800">{displayModel}</div>
                            {log.provider_name && (
                              <div className="text-[10px] text-slate-500">{log.provider_name}</div>
                            )}
                          </div>
                        </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-lg border ${
                          log.request_method === 'GET' ? 'bg-sky-50 text-sky-700 border-sky-200/50' :
                          log.request_method === 'POST' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' :
                          'bg-slate-50 text-slate-600 border-slate-200/50'
                        }`}>
                          {log.request_method}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-600 font-mono max-w-xs truncate">
                          {log.request_path}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full border ${
                          log.response_status >= 200 && log.response_status < 300 ? 'bg-emerald-100/80 text-emerald-700 border-emerald-200/50' :
                          log.response_status >= 400 && log.response_status < 500 ? 'bg-amber-100/80 text-amber-700 border-amber-200/50' :
                          log.response_status >= 500 ? 'bg-rose-100/80 text-rose-700 border-rose-200/50' :
                          'bg-slate-100/80 text-slate-600 border-slate-200/50'
                        }`}>
                          {log.response_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs text-slate-600">
                          {log.response_time_ms}ms
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-medium">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors duration-300"
                        >
                          查看详情
                        </button>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <div className="text-xs text-slate-600">
              共 <span className="font-semibold text-slate-800">{total}</span> 条记录
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                上一页
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={(page + 1) * limit >= total}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      </main>

      {selectedLog && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedLog(null)}></div>
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full border border-emerald-100/50">
              <div className="bg-white px-6 pt-5 pb-4 sm:p-6">
                <div className="mb-5">
                  <h3 className="text-base font-bold text-slate-800 mb-1">
                    请求详情
                  </h3>
                  <p className="text-xs text-slate-500">查看完整的请求和响应信息</p>
                </div>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-slate-700">请求头</h4>
                      <button
                        onClick={() => copyToClipboard(formatJSON(selectedLog.request_headers))}
                        className="px-2 py-0.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                      >
                        复制
                      </button>
                    </div>
                    <pre className="bg-slate-50/80 border border-slate-200 p-3 rounded-xl text-[10px] overflow-x-auto font-mono text-slate-700">
                      {formatJSON(selectedLog.request_headers)}
                    </pre>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-slate-700">请求 Query</h4>
                      <button
                        onClick={() => copyToClipboard(formatJSON(selectedLog.request_query))}
                        className="px-2 py-0.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                      >
                        复制
                      </button>
                    </div>
                    <pre className="bg-slate-50/80 border border-slate-200 p-3 rounded-xl text-[10px] overflow-x-auto font-mono text-slate-700">
                      {formatJSON(selectedLog.request_query)}
                    </pre>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-slate-700">请求 Body</h4>
                      <button
                        onClick={() => copyToClipboard(formatJSON(selectedLog.request_body))}
                        className="px-2 py-0.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                      >
                        复制
                      </button>
                    </div>
                    <pre className="bg-slate-50/80 border border-slate-200 p-3 rounded-xl text-[10px] overflow-x-auto font-mono text-slate-700">
                      {formatJSON(selectedLog.request_body)}
                    </pre>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-slate-700">响应 Body</h4>
                      <button
                        onClick={() => copyToClipboard(formatJSON(selectedLog.response_body))}
                        className="px-2 py-0.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                      >
                        复制
                      </button>
                    </div>
                    <pre className="bg-slate-50/80 border border-slate-200 p-3 rounded-xl text-[10px] overflow-x-auto font-mono text-slate-700">
                      {formatJSON(selectedLog.response_body)}
                    </pre>
                  </div>
                </div>
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedLog(null)}
                    className="px-4 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400/30 transition-all duration-300"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <ConfirmDialog
          open={confirmDialog.open}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
          type="danger"
        />
      )}
    </>
  );
}
