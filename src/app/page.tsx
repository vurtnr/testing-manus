'use client';

import { useState, useEffect } from 'react';
import FileManager from '@/components/FileManager';
import ChatPanel from '@/components/ChatPanel';
import EvidencePanel from '@/components/EvidencePanel';
import { Citation, getCurrentUser, logout, UserInfo } from '@/lib/api';

export default function Home() {
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  const handleUploadComplete = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="app-layout">
      <div className="app-header">
        <div className="app-header-left">
          <span className="app-header-brand">MaterialSense</span>
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
      <div className="app-main">
        <FileManager
          refreshKey={refreshKey}
          onUploadComplete={handleUploadComplete}
        />
        <ChatPanel
          onCitations={setCitations}
          onCitationClick={setActiveCitation}
        />
        <EvidencePanel
          citations={citations}
          activeCitation={activeCitation}
          onCitationClick={setActiveCitation}
        />
      </div>
    </div>
  );
}
