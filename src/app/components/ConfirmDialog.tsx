'use client';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = '确认',
  cancelText = '取消',
  type = 'info',
}: ConfirmDialogProps) {
  if (!open) return null;

  const buttonColors = {
    danger: 'bg-rose-500 hover:bg-rose-600 focus:ring-rose-500/50',
    warning: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500/50',
    info: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/50',
  };

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onCancel}></div>
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full border border-emerald-100/50">
          <div className="bg-white px-5 pt-5 pb-4 sm:p-6">
            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-800 mb-1">{title}</h3>
              <p className="text-xs text-slate-600">{message}</p>
            </div>
            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400/30 transition-all duration-300"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`px-4 py-1.5 border border-transparent rounded-lg text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all duration-300 ${buttonColors[type]}`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
