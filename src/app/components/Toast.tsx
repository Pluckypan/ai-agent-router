'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = 'info', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    success: 'bg-emerald-500 text-white border-emerald-600/30 shadow-emerald-500/20',
    error: 'bg-rose-500 text-white border-rose-600/30 shadow-rose-500/20',
    info: 'bg-slate-600 text-white border-slate-700/30 shadow-slate-600/20',
  };

  const icons = {
    success: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    info: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className="fixed top-20 right-5 z-50 animate-in slide-in-from-right fade-in duration-300">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border backdrop-blur-sm ${colors[type]}`}>
        <span className="flex-shrink-0">{icons[type]}</span>
        <span className="text-xs font-medium leading-tight">{message}</span>
        <button
          onClick={onClose}
          className="ml-1.5 flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity p-0.5"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
