'use client';

import { useState, FormEvent } from 'react';
import './login.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');
    setPasswordError('');

    let hasError = false;
    if (!email.trim()) {
      setEmailError('请输入邮箱地址');
      hasError = true;
    }
    if (!password.trim()) {
      setPasswordError('请输入密码');
      hasError = true;
    }
    if (hasError) return;

    await doLogin(email, password);
  };

  const handleDemo = async () => {
    setError('');
    setEmailError('');
    setPasswordError('');
    await doLogin('demo@materialsense.cn', 'demo123');
  };

  const doLogin = async (emailAddr: string, pass: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailAddr, password: pass }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 429) {
          setError('登录尝试过多，请稍后再试');
        } else {
          setError(data.error || '邮箱或密码错误');
        }
        return;
      }

      window.location.href = '/';
    } catch {
      setError('网络连接失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="showcase-panel">
        <div className="showcase-content">
          <div className="brand-icon">
            <span>M&#x2084;</span>
          </div>
          <div className="brand-name">MaterialSense</div>
          <div className="brand-sub">材料检测智能体平台</div>

          <div className="tagline">"材料检测，一个Agent就够了"</div>
          <div className="tagline-detail">
            材料检测智能体，全品类材料标准与检测方法一站式覆盖<br />
            智能检索 · 条款追溯 · 适用范围分析 · 检测方案推荐<br />
            持续学习，标准更新自动纳入知识库
          </div>

          <div className="standard-badges">
            <div className="badge">智能检索</div>
            <div className="badge">条款追溯</div>
            <div className="badge">方案推荐</div>
            <div className="badge">标准追踪</div>
          </div>
        </div>
      </div>

      <div className="form-panel">
        <div className="form-wrapper">
          <div className="form-header">
            <div className="form-title">登录</div>
            <div className="form-subtitle">进入您的材料检测工作空间</div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">邮箱地址</label>
              <input
                type="email"
                className={`form-input ${emailError ? 'error' : ''}`}
                placeholder="name@lab.cn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              {emailError && <div className="field-error">{emailError}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">密码</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${passwordError ? 'error' : ''}`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? '隐藏' : '显示'}
                </button>
              </div>
              {passwordError && <div className="field-error">{passwordError}</div>}
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading && <span className="login-spinner" />}
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <div className="form-divider"><span>或</span></div>

          <button
            className="demo-btn"
            onClick={handleDemo}
            disabled={loading}
          >
            体验演示账号
          </button>

          <div className="form-footer">
            还没有账号？请联系管理员
          </div>

          <div className="trust-footer">
            符合行业数据安全要求
            <div className="compliance">
              <span>CMA</span>
              <span>CNAS</span>
              <span>ISO/IEC 17025</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
