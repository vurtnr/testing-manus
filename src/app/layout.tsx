import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '知识库问答助手',
  description: 'RAG Knowledge Base Chatbot - 双语文档智能问答平台',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
