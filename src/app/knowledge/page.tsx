'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FileManager from '@/components/FileManager';
import ChatPanel from '@/components/ChatPanel';
import EvidencePanel from '@/components/EvidencePanel';
import { Citation, getCurrentUser, logout, UserInfo } from '@/lib/api';
import './knowledge.css';

export default function KnowledgePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // FileManager state
  const [refreshKey, setRefreshKey] = useState(0);

  // Chat + Evidence state
  const [citations, setCitations] = useState<Citation[]>([]);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  const handleUploadComplete = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleCitations = useCallback((newCitations: Citation[]) => {
    setCitations(newCitations);
    setActiveCitation(null);
  }, []);

  const handleCitationClick = useCallback((citation: Citation) => {
    setActiveCitation(citation);
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="app-layout">
      <div className="app-header">
        <div className="app-header-left">
          <button className="app-header-back" onClick={() => router.push('/')}>
            ← 返回工作台
          </button>
          <div className="app-header-divider" />
          <span className="app-header-title">📚 知识库</span>
        </div>
        <div className="app-header-right">
          {user && (
            <div className="user-menu-wrapper">
              <button
                className="user-avatar"
                onClick={() => setShowUserMenu(!showUserMenu)}
                onBlur={() => setTimeout(() => setShowUserMenu(false), 150)}
              >
                {(user.displayName || user.email).charAt(0).toUpperCase()}
              </button>
              {showUserMenu && (
                <div className="user-dropdown">
                  <div className="user-dropdown-name">{user.displayName || user.email}</div>
                  <div className="user-dropdown-email">{user.email}</div>
                  <button className="user-dropdown-logout" onClick={handleLogout}>
                    退出登录
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="three-column-layout">
        <FileManager refreshKey={refreshKey} onUploadComplete={handleUploadComplete} />
        <ChatPanel onCitations={handleCitations} onCitationClick={handleCitationClick} />
        <EvidencePanel
          citations={citations}
          activeCitation={activeCitation}
          onCitationClick={handleCitationClick}
        />
      </div>
    </div>
  );
}
