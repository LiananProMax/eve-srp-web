/**
 * EVE SRP 应用主入口
 * 只包含路由配置和顶层 Provider
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext';
import { ConfigProvider } from './contexts/ConfigContext';

// 页面组件
import Home from './pages/Home';
import SRPLogin from './pages/auth/SRPLogin';
import AuthCallback from './pages/auth/AuthCallback';
import Dashboard from './pages/dashboard/Dashboard';
import MyRequests from './pages/my-requests/MyRequests';
import Admin from './pages/admin/Admin';

function App() {
  return (
    <ConfigProvider>
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            {/* 公开首页 - 军团展示 */}
            <Route path="/" element={<Home />} />
            
            {/* SRP 登录页 */}
            <Route path="/srp" element={<SRPLogin />} />
            
            {/* EVE SSO 回调 */}
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* 用户面板 - 申请补损 */}
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* 我的申请 */}
            <Route path="/my-requests" element={<MyRequests />} />
            
            {/* 管理员后台 */}
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </ConfigProvider>
  );
}

export default App;
