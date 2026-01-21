import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, useNavigate, useSearchParams, Link } from 'react-router-dom';

const API_BASE = 'http://localhost:3001/api';
const EVE_CLIENT_ID = 'daa4dbb782144ccdb1d0ac87a33acccb';
const REDIRECT_URI = 'http://localhost:5173/auth/callback';

// 状态中文映射和颜色
const STATUS_MAP = {
  pending: { text: '待审核', color: '#f59e0b', bg: '#fef3c7' },
  approved: { text: '已批准', color: '#10b981', bg: '#d1fae5' },
  rejected: { text: '已拒绝', color: '#ef4444', bg: '#fee2e2' }
};

// 通用样式
const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  card: {
    background: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    padding: '20px',
    marginBottom: '20px'
  },
  button: {
    padding: '10px 20px',
    fontSize: '14px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  primaryBtn: {
    background: '#3b82f6',
    color: 'white'
  },
  successBtn: {
    background: '#10b981',
    color: 'white'
  },
  dangerBtn: {
    background: '#ef4444',
    color: 'white'
  },
  input: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    width: '100%',
    boxSizing: 'border-box'
  },
  nav: {
    display: 'flex',
    gap: '15px',
    marginBottom: '20px',
    padding: '15px',
    background: '#1e293b',
    borderRadius: '8px'
  },
  navLink: {
    color: '#94a3b8',
    textDecoration: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    transition: 'all 0.2s'
  }
};

// 1. 登录页
function Login() {
  const handleLogin = () => {
    const url = `https://login.eveonline.com/v2/oauth/authorize/?response_type=code&redirect_uri=${REDIRECT_URI}&client_id=${EVE_CLIENT_ID}&state=srp_login`;
    window.location.href = url;
  };

  return (
    <div style={{ ...styles.container, textAlign: 'center', marginTop: '100px' }}>
      <div style={styles.card}>
        <h1 style={{ marginBottom: '10px', color: '#1e293b' }}>军团补损系统 (SRP)</h1>
        <p style={{ color: '#64748b', marginBottom: '30px' }}>Ship Replacement Program</p>
        <button
          onClick={handleLogin}
          style={{ ...styles.button, ...styles.primaryBtn, padding: '15px 40px', fontSize: '16px' }}
        >
          使用 EVE SSO 登录
        </button>
        <br /><br />
        <Link to="/admin" style={{ color: '#64748b' }}>管理员入口</Link>
      </div>
    </div>
  );
}

// 2. SSO 回调处理
function AuthCallback() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      axios.post(`${API_BASE}/auth/eve`, { code })
        .then(res => {
          localStorage.setItem('user', JSON.stringify(res.data));
          navigate('/dashboard');
        })
        .catch(err => {
          // 登录失败时清除旧的用户数据
          localStorage.removeItem('user');
          alert('登录失败：' + (err.response?.data?.error || '非本军团成员'));
          navigate('/');
        });
    }
  }, [code, navigate]);

  return (
    <div style={{ ...styles.container, textAlign: 'center', marginTop: '100px' }}>
      <div style={styles.card}>
        <p>正在验证身份...</p>
      </div>
    </div>
  );
}

// 3. 用户导航栏
function UserNav({ charName, onLogout }) {
  return (
    <nav style={styles.nav}>
      <Link to="/dashboard" style={styles.navLink}>申请补损</Link>
      <Link to="/my-requests" style={styles.navLink}>我的申请</Link>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <span style={{ color: '#94a3b8' }}>欢迎, {charName}</span>
        <button
          onClick={onLogout}
          style={{ ...styles.button, background: 'transparent', color: '#94a3b8', padding: '8px 16px' }}
        >
          退出
        </button>
      </div>
    </nav>
  );
}

// 4. 用户面板：选择损失
function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();
  const [losses, setLosses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null);

  useEffect(() => {
    if (!user?.charId) {
      navigate('/');
      return;
    }
    axios.get(`${API_BASE}/losses/${user.charId}`)
      .then(res => setLosses(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (loss) => {
    const comment = prompt("备注说明 (可选):");
    setSubmitting(loss.killmail_id);
    try {
      await axios.post(`${API_BASE}/srp`, {
        charId: user.charId,
        charName: user.charName,
        lossMail: loss,
        comment
      });
      alert('提交成功！可以在"我的申请"中查看进度。');
    } catch (err) {
      alert('提交失败: ' + (err.response?.data?.error || '未知错误'));
    } finally {
      setSubmitting(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  if (!user) return null;

  return (
    <div style={styles.container}>
      <UserNav charName={user.charName} onLogout={handleLogout} />
      
      <div style={styles.card}>
        <h2 style={{ marginBottom: '5px' }}>申请补损</h2>
        <p style={{ color: '#64748b', marginBottom: '20px' }}>选择需要补损的损失记录</p>
        
        {loading ? (
          <p>正在从 zKillboard 获取数据...</p>
        ) : losses.length === 0 ? (
          <p style={{ color: '#64748b' }}>暂无损失记录</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
            {losses.map(loss => (
              <div key={loss.killmail_id} style={{
                border: '1px solid #e2e8f0',
                padding: '15px',
                borderRadius: '8px',
                background: '#f8fafc'
              }}>
                <p><strong>船只ID:</strong> {loss.ship_type_id}</p>
                <p><strong>时间:</strong> {new Date(loss.killmail_time).toLocaleString()}</p>
                <p><strong>损失价值:</strong> {(loss.zkb?.totalValue / 1000000)?.toFixed(2) || '未知'} M ISK</p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <a
                    href={`https://zkillboard.com/kill/${loss.killmail_id}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#3b82f6' }}
                  >
                    查看详情
                  </a>
                  <button
                    onClick={() => handleSubmit(loss)}
                    disabled={submitting === loss.killmail_id}
                    style={{ ...styles.button, ...styles.primaryBtn, marginLeft: 'auto' }}
                  >
                    {submitting === loss.killmail_id ? '提交中...' : '申请补损'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 5. 我的申请页面
function MyRequests() {
  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.charId) {
      navigate('/');
      return;
    }
    axios.get(`${API_BASE}/srp/my/${user.charId}`)
      .then(res => setRequests(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  if (!user) return null;

  return (
    <div style={styles.container}>
      <UserNav charName={user.charName} onLogout={handleLogout} />
      
      <div style={styles.card}>
        <h2 style={{ marginBottom: '5px' }}>我的补损申请</h2>
        <p style={{ color: '#64748b', marginBottom: '20px' }}>查看申请进度和管理员反馈</p>
        
        {loading ? (
          <p>加载中...</p>
        ) : requests.length === 0 ? (
          <p style={{ color: '#64748b' }}>暂无申请记录</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>提交时间</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>船只ID</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>zKill链接</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>我的备注</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>状态</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>管理员反馈</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => {
                  const statusInfo = STATUS_MAP[req.status] || STATUS_MAP.pending;
                  return (
                    <tr key={req.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px' }}>
                        {new Date(req.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px' }}>{req.ship_type_id}</td>
                      <td style={{ padding: '12px' }}>
                        <a href={req.zkill_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>
                          查看
                        </a>
                      </td>
                      <td style={{ padding: '12px', color: '#64748b' }}>{req.player_comment || '-'}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '500',
                          color: statusInfo.color,
                          background: statusInfo.bg
                        }}>
                          {statusInfo.text}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {req.admin_comment ? (
                          <div>
                            <p style={{ margin: 0, color: '#374151' }}>{req.admin_comment}</p>
                            {req.reviewed_by && (
                              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9ca3af' }}>
                                —— {req.reviewed_by}, {new Date(req.reviewed_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// 6. 管理员界面
function Admin() {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [token, setToken] = useState(localStorage.getItem('adminToken'));
  const [adminInfo, setAdminInfo] = useState(null);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState([]);
  const [filter, setFilter] = useState('all');
  const [reviewModal, setReviewModal] = useState(null);
  const [adminComment, setAdminComment] = useState('');
  const [view, setView] = useState('requests'); // 'requests' | 'admins'
  const [admins, setAdmins] = useState([]);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '' });

  const login = async () => {
    try {
      const res = await axios.post(`${API_BASE}/admin/login`, creds);
      localStorage.setItem('adminToken', res.data.token);
      setToken(res.data.token);
      setAdminInfo(res.data.admin);
      fetchRequests(res.data.token);
    } catch (err) {
      alert('登录失败: ' + (err.response?.data?.error || '用户名或密码错误'));
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    setToken(null);
    setAdminInfo(null);
  };

  const fetchRequests = async (t, statusFilter = 'all') => {
    try {
      const res = await axios.get(`${API_BASE}/admin/requests`, {
        headers: { Authorization: `Bearer ${t}` },
        params: { status: statusFilter }
      });
      setRequests(res.data.requests);
      setStats(res.data.stats);
    } catch (err) {
      if (err.response?.status === 403) {
        logout();
      }
    }
  };

  const fetchAdmins = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/admins`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdmins(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReview = async (action) => {
    try {
      await axios.post(`${API_BASE}/admin/review`, {
        id: reviewModal.id,
        action,
        adminComment
      }, { headers: { Authorization: `Bearer ${token}` } });
      setReviewModal(null);
      setAdminComment('');
      fetchRequests(token, filter);
    } catch (err) {
      alert('操作失败');
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdmin.username || !newAdmin.password) {
      alert('请填写用户名和密码');
      return;
    }
    try {
      await axios.post(`${API_BASE}/admin/admins`, newAdmin, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewAdmin({ username: '', password: '' });
      fetchAdmins();
      alert('添加成功');
    } catch (err) {
      alert('添加失败: ' + (err.response?.data?.error || '未知错误'));
    }
  };

  const handleDeleteAdmin = async (id) => {
    if (!confirm('确定要删除该管理员吗？')) return;
    try {
      await axios.delete(`${API_BASE}/admin/admins/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAdmins();
    } catch (err) {
      alert('删除失败: ' + (err.response?.data?.error || '未知错误'));
    }
  };

  useEffect(() => {
    if (token) {
      fetchRequests(token);
    }
  }, [token]);

  useEffect(() => {
    if (token && view === 'admins') {
      fetchAdmins();
    }
  }, [view]);

  // 登录界面
  if (!token) {
    return (
      <div style={{ ...styles.container, maxWidth: '400px', marginTop: '100px' }}>
        <div style={styles.card}>
          <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>管理员登录</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input
              placeholder="账号"
              value={creds.username}
              onChange={e => setCreds({ ...creds, username: e.target.value })}
              style={styles.input}
            />
            <input
              type="password"
              placeholder="密码"
              value={creds.password}
              onChange={e => setCreds({ ...creds, password: e.target.value })}
              onKeyPress={e => e.key === 'Enter' && login()}
              style={styles.input}
            />
            <button onClick={login} style={{ ...styles.button, ...styles.primaryBtn }}>
              登录
            </button>
          </div>
          <p style={{ textAlign: 'center', marginTop: '20px' }}>
            <Link to="/" style={{ color: '#64748b' }}>返回首页</Link>
          </p>
        </div>
      </div>
    );
  }

  // 统计数据
  const getStatCount = (status) => {
    const stat = stats.find(s => s.status === status);
    return stat ? stat.count : 0;
  };

  return (
    <div style={styles.container}>
      {/* 顶部导航 */}
      <nav style={styles.nav}>
        <button
          onClick={() => setView('requests')}
          style={{
            ...styles.navLink,
            background: view === 'requests' ? '#3b82f6' : 'transparent',
            color: view === 'requests' ? 'white' : '#94a3b8',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          申请管理
        </button>
        {adminInfo?.role === 'super_admin' && (
          <button
            onClick={() => setView('admins')}
            style={{
              ...styles.navLink,
              background: view === 'admins' ? '#3b82f6' : 'transparent',
              color: view === 'admins' ? 'white' : '#94a3b8',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            管理员设置
          </button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ color: '#94a3b8' }}>
            {adminInfo?.username} ({adminInfo?.role === 'super_admin' ? '超级管理员' : '管理员'})
          </span>
          <button onClick={logout} style={{ ...styles.button, background: 'transparent', color: '#94a3b8' }}>
            退出
          </button>
        </div>
      </nav>

      {/* 申请管理视图 */}
      {view === 'requests' && (
        <>
          {/* 统计卡片 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
            <div style={{ ...styles.card, textAlign: 'center', cursor: 'pointer' }} onClick={() => { setFilter('all'); fetchRequests(token, 'all'); }}>
              <p style={{ color: '#64748b', marginBottom: '5px' }}>全部</p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>
                {getStatCount('pending') + getStatCount('approved') + getStatCount('rejected')}
              </p>
            </div>
            <div style={{ ...styles.card, textAlign: 'center', cursor: 'pointer', borderLeft: '4px solid #f59e0b' }} onClick={() => { setFilter('pending'); fetchRequests(token, 'pending'); }}>
              <p style={{ color: '#64748b', marginBottom: '5px' }}>待审核</p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{getStatCount('pending')}</p>
            </div>
            <div style={{ ...styles.card, textAlign: 'center', cursor: 'pointer', borderLeft: '4px solid #10b981' }} onClick={() => { setFilter('approved'); fetchRequests(token, 'approved'); }}>
              <p style={{ color: '#64748b', marginBottom: '5px' }}>已批准</p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{getStatCount('approved')}</p>
            </div>
            <div style={{ ...styles.card, textAlign: 'center', cursor: 'pointer', borderLeft: '4px solid #ef4444' }} onClick={() => { setFilter('rejected'); fetchRequests(token, 'rejected'); }}>
              <p style={{ color: '#64748b', marginBottom: '5px' }}>已拒绝</p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{getStatCount('rejected')}</p>
            </div>
          </div>

          {/* 申请列表 */}
          <div style={styles.card}>
            <h3 style={{ marginBottom: '15px' }}>
              {filter === 'all' ? '全部申请' : filter === 'pending' ? '待审核' : filter === 'approved' ? '已批准' : '已拒绝'}
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>角色</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>提交时间</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>zKill</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>玩家备注</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>状态</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>管理员备注</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(req => {
                    const statusInfo = STATUS_MAP[req.status] || STATUS_MAP.pending;
                    return (
                      <tr key={req.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px' }}>{req.char_name}</td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#64748b' }}>
                          {new Date(req.created_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <a href={req.zkill_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>
                            链接
                          </a>
                        </td>
                        <td style={{ padding: '12px', maxWidth: '200px', color: '#64748b' }}>
                          {req.player_comment || '-'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '500',
                            color: statusInfo.color,
                            background: statusInfo.bg
                          }}>
                            {statusInfo.text}
                          </span>
                        </td>
                        <td style={{ padding: '12px', maxWidth: '200px' }}>
                          {req.admin_comment || '-'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {req.status === 'pending' ? (
                            <button
                              onClick={() => setReviewModal(req)}
                              style={{ ...styles.button, ...styles.primaryBtn, padding: '6px 12px', fontSize: '12px' }}
                            >
                              审核
                            </button>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                              {req.reviewed_by}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {requests.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                        暂无数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 管理员设置视图 */}
      {view === 'admins' && (
        <div style={styles.card}>
          <h3 style={{ marginBottom: '20px' }}>管理员管理</h3>

          {/* 添加管理员 */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <input
              placeholder="用户名"
              value={newAdmin.username}
              onChange={e => setNewAdmin({ ...newAdmin, username: e.target.value })}
              style={{ ...styles.input, width: '200px' }}
            />
            <input
              type="password"
              placeholder="密码"
              value={newAdmin.password}
              onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })}
              style={{ ...styles.input, width: '200px' }}
            />
            <button onClick={handleAddAdmin} style={{ ...styles.button, ...styles.successBtn }}>
              添加管理员
            </button>
          </div>

          {/* 管理员列表 */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>用户名</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>角色</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>创建时间</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {admins.map(admin => (
                <tr key={admin.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px' }}>{admin.username}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      background: admin.role === 'super_admin' ? '#dbeafe' : '#f1f5f9',
                      color: admin.role === 'super_admin' ? '#2563eb' : '#64748b'
                    }}>
                      {admin.role === 'super_admin' ? '超级管理员' : '管理员'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#64748b' }}>
                    {new Date(admin.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {admin.role !== 'super_admin' && (
                      <button
                        onClick={() => handleDeleteAdmin(admin.id)}
                        style={{ ...styles.button, ...styles.dangerBtn, padding: '6px 12px', fontSize: '12px' }}
                      >
                        删除
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 审核弹窗 */}
      {reviewModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ ...styles.card, width: '500px', maxWidth: '90%' }}>
            <h3 style={{ marginBottom: '15px' }}>审核申请</h3>
            <p><strong>角色:</strong> {reviewModal.char_name}</p>
            <p><strong>zKill:</strong> <a href={reviewModal.zkill_url} target="_blank" rel="noopener noreferrer">{reviewModal.zkill_url}</a></p>
            <p><strong>玩家备注:</strong> {reviewModal.player_comment || '无'}</p>

            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                管理员建议/备注:
              </label>
              <textarea
                value={adminComment}
                onChange={e => setAdminComment(e.target.value)}
                placeholder="可选：输入给玩家的反馈信息..."
                style={{ ...styles.input, minHeight: '100px', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setReviewModal(null); setAdminComment(''); }}
                style={{ ...styles.button, background: '#e2e8f0', color: '#374151' }}
              >
                取消
              </button>
              <button
                onClick={() => handleReview('reject')}
                style={{ ...styles.button, ...styles.dangerBtn }}
              >
                拒绝
              </button>
              <button
                onClick={() => handleReview('approve')}
                style={{ ...styles.button, ...styles.successBtn }}
              >
                批准
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/my-requests" element={<MyRequests />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
