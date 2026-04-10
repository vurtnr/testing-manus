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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span>工作台</span>
          </button>
          <svg className="app-header-sep" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span className="app-header-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
            知识库
          </span>
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
