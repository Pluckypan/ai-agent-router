'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Nav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: '配置' },
    { href: '/providers', label: '供应商' },
    { href: '/models', label: '模型' },
    { href: '/logs', label: '日志' },
  ];

  return (
    <nav className="bg-white/70 backdrop-blur-xl border-b border-emerald-100/30 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-12">
            <Link href="/" className="flex flex-col group transition-all duration-300">
              <span className="text-xl font-bold text-emerald-700 group-hover:text-emerald-600 transition-colors duration-300 leading-none">
                AAR
              </span>
              <span className="text-[9px] font-medium text-slate-400 tracking-wider uppercase mt-0.5 leading-none">
                AI Agent Router
              </span>
            </Link>
            <div className="hidden sm:flex sm:items-center">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="relative inline-flex items-center justify-center w-[68px] h-9 text-xs font-medium transition-colors duration-300 group"
                    style={{ minWidth: '68px', maxWidth: '68px' }}
                  >
                    {/* 固定宽度和高度，完全避免抖动 - 使用绝对定位确保位置不变 */}
                    <span 
                      className={`absolute inset-0 flex items-center justify-center transition-colors duration-300 ${
                        isActive 
                          ? 'text-emerald-700 font-semibold' 
                          : 'text-slate-500 group-hover:text-slate-700'
                      }`}
                    >
                      {item.label}
                    </span>
                    {/* 选中状态背景 - 固定尺寸，不改变布局 */}
                    <span 
                      className={`absolute inset-0 rounded-lg transition-all duration-300 ${
                        isActive 
                          ? 'bg-emerald-50/60' 
                          : 'bg-transparent group-hover:bg-slate-50/40'
                      }`}
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
