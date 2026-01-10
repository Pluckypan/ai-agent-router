import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from './components/ToastProvider';

export const metadata: Metadata = {
  title: 'AAR - AI Agent Router',
  description: 'Unified API gateway for managing multiple AI model providers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
