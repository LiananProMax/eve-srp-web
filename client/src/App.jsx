import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, useNavigate, useSearchParams, Link, useLocation } from 'react-router-dom';
import {
  Layout,
  Menu,
  Button,
  Card,
  Table,
  Tag,
  Space,
  Typography,
  Input,
  Form,
  Modal,
  Spin,
  Statistic,
  Row,
  Col,
  Avatar,
  Divider,
  message,
  Result,
  Popconfirm,
  Empty,
  Tooltip,
} from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  FileTextOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SettingOutlined,
  LinkOutlined,
  RocketOutlined,
  TeamOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
  LoginOutlined,
  HomeOutlined,
} from '@ant-design/icons';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// === 环境配置 ===
// 生产环境使用相对路径（通过反向代理），开发环境使用本地地址
const isDev = import.meta.env.DEV;
const API_BASE = isDev ? 'http://localhost:3001/api' : '/api';
const EVE_CLIENT_ID = 'daa4dbb782144ccdb1d0ac87a33acccb';
// 动态获取回调地址，支持任意域名部署
const REDIRECT_URI = `${window.location.origin}/auth/callback`;

// === 创建带认证的 axios 实例 ===
const createAuthAxios = (tokenKey = 'user') => {
  const instance = axios.create({ baseURL: API_BASE });
  
  instance.interceptors.request.use((config) => {
    try {
      const stored = localStorage.getItem(tokenKey);
      if (stored) {
        let token;
        if (tokenKey === 'user') {
          // user 存储的是 JSON 对象 { charId, charName, token }
          const data = JSON.parse(stored);
          token = data.token;
        } else {
          // adminToken 存储的是纯 token 字符串
          token = stored;
        }
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (e) {
      console.error('Token parsing error:', e);
      localStorage.removeItem(tokenKey);
    }
    return config;
  });
  
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      // 只在认证失败时自动跳转，不要在其他错误时跳转
      if (error.response?.status === 401 || error.response?.status === 403) {
        // 检查是否是 token 相关的错误
        const errorMsg = error.response?.data?.error || '';
        if (errorMsg.includes('token') || errorMsg.includes('Token') || errorMsg.includes('凭证')) {
          localStorage.removeItem(tokenKey);
          if (tokenKey === 'user') {
            window.location.href = '/';
          } else {
            window.location.href = '/admin';
          }
        }
      }
      return Promise.reject(error);
    }
  );
  
  return instance;
};

// 用户 API 实例
const userApi = createAuthAxios('user');
// 管理员 API 实例  
const adminApi = createAuthAxios('adminToken');

// 状态配置
const STATUS_CONFIG = {
  pending: { text: '待审核', color: 'warning', icon: <ClockCircleOutlined /> },
  approved: { text: '已批准', color: 'success', icon: <CheckCircleOutlined /> },
  rejected: { text: '已拒绝', color: 'error', icon: <CloseCircleOutlined /> }
};

// 1. 登录页
function Login() {
  const handleLogin = () => {
    const url = `https://login.eveonline.com/v2/oauth/authorize/?response_type=code&redirect_uri=${REDIRECT_URI}&client_id=${EVE_CLIENT_ID}&state=srp_login`;
    window.location.href = url;
  };

  return (
    <div className="login-background" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <Card
        style={{ 
          width: 420, 
          textAlign: 'center',
          background: 'rgba(30, 41, 59, 0.9)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
        styles={{ body: { padding: '48px 32px' } }}
      >
        <div style={{ marginBottom: 24 }}>
          <RocketOutlined style={{ fontSize: 64, color: '#3b82f6', marginBottom: 16 }} />
          <Title level={2} style={{ margin: 0, color: '#f1f5f9' }}>
            军团补损系统
          </Title>
          <Text type="secondary" style={{ fontSize: 16 }}>
            Ship Replacement Program
          </Text>
        </div>
        
        <Divider style={{ borderColor: 'rgba(148, 163, 184, 0.2)' }} />
        
        <Paragraph style={{ color: '#94a3b8', marginBottom: 32 }}>
          使用 EVE Online 账号登录，查看并提交补损申请
        </Paragraph>
        
        <Button
          type="primary"
          size="large"
          icon={<LoginOutlined />}
          onClick={handleLogin}
          style={{ 
            width: '100%', 
            height: 50, 
            fontSize: 16,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            border: 'none',
          }}
        >
          使用 EVE SSO 登录
        </Button>
        
        <Divider style={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>其他入口</Text>
        </Divider>
        
        <Link to="/admin">
          <Button type="link" icon={<SettingOutlined />}>
            管理员入口
          </Button>
        </Link>
      </Card>
    </div>
  );
}

// 2. SSO 回调处理
function AuthCallback() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const navigate = useNavigate();
  const hasRequested = useRef(false);

  useEffect(() => {
    // 防止 React 18 严格模式下重复发送请求（code 只能使用一次）
    if (code && !hasRequested.current) {
      hasRequested.current = true;
      axios.post(`${API_BASE}/auth/eve`, { code })
        .then(res => {
          // 存储用户信息和 JWT token
          localStorage.setItem('user', JSON.stringify({
            charId: res.data.charId,
            charName: res.data.charName,
            token: res.data.token  // 存储 JWT token
          }));
          message.success('登录成功！');
          navigate('/dashboard');
        })
        .catch(err => {
          localStorage.removeItem('user');
          message.error('登录失败：' + (err.response?.data?.error || '非本军团成员'));
          navigate('/');
        });
    }
  }, [code, navigate]);

  return (
    <div className="login-background" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      minHeight: '100vh'
    }}>
      <Card style={{ 
        width: 400, 
        textAlign: 'center',
        background: 'rgba(30, 41, 59, 0.9)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
      }}>
        <Spin size="large" />
        <Title level={4} style={{ marginTop: 24, color: '#f1f5f9' }}>
          正在验证身份...
        </Title>
        <Text type="secondary">请稍候，正在与 EVE Online 服务器通信</Text>
      </Card>
    </div>
  );
}

// 3. 用户布局组件
function UserLayout({ children }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('user');
    message.info('已退出登录');
    navigate('/');
  };

  const menuItems = [
    { key: '/dashboard', icon: <PlusOutlined />, label: '申请补损' },
    { key: '/my-requests', icon: <FileTextOutlined />, label: '我的申请' },
  ];

  return (
    <Layout className="eve-background" style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: 'rgba(15, 17, 25, 0.95)',
        borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginRight: 48 }}>
          <RocketOutlined style={{ fontSize: 24, color: '#3b82f6', marginRight: 12 }} />
          <Title level={4} style={{ margin: 0, color: '#f1f5f9' }}>SRP 系统</Title>
        </div>
        
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ 
            flex: 1, 
            background: 'transparent', 
            borderBottom: 'none',
            minWidth: 0,
          }}
        />
        
        <Space size={16}>
          <Avatar 
            style={{ backgroundColor: '#3b82f6' }} 
            icon={<UserOutlined />}
          />
          <Text style={{ color: '#94a3b8' }}>
            欢迎, <Text strong style={{ color: '#f1f5f9' }}>{user.charName}</Text>
          </Text>
          <Button 
            type="text" 
            icon={<LogoutOutlined />} 
            onClick={handleLogout}
            style={{ color: '#94a3b8' }}
          >
            退出
          </Button>
        </Space>
      </Header>
      
      <Content style={{ padding: '24px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        {children}
      </Content>
    </Layout>
  );
}

// 4. 用户面板：选择损失
function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  const [losses, setLosses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLoss, setSelectedLoss] = useState(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!user?.charId || !user?.token) {
      navigate('/');
      return;
    }
    userApi.get(`/losses/${user.charId}`)
      .then(res => setLosses(res.data))
      .catch(err => {
        console.error(err);
        message.error('获取损失记录失败');
      })
      .finally(() => setLoading(false));
  }, []);

  const openSubmitModal = (loss) => {
    setSelectedLoss(loss);
    setComment('');
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!selectedLoss) return;
    
    setSubmitting(selectedLoss.killmail_id);
    try {
      // 不再需要发送 charId 和 charName，服务端从 token 中获取
      await userApi.post('/srp', {
        lossMail: selectedLoss,
        comment
      });
      message.success('申请提交成功！可以在"我的申请"中查看进度。');
      setModalVisible(false);
    } catch (err) {
      message.error('提交失败: ' + (err.response?.data?.error || '未知错误'));
    } finally {
      setSubmitting(null);
    }
  };

  if (!user.charId) return null;

  return (
    <UserLayout>
      <Card
        title={
          <Space>
            <PlusOutlined />
            <span>申请补损</span>
          </Space>
        }
        extra={<Text type="secondary">选择需要补损的损失记录</Text>}
        style={{ 
          background: 'rgba(30, 41, 59, 0.6)',
          border: '1px solid rgba(51, 65, 85, 0.5)',
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
            <Paragraph style={{ marginTop: 16 }}>正在从 zKillboard 获取数据...</Paragraph>
          </div>
        ) : losses.length === 0 ? (
          <Empty 
            description="暂无损失记录" 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Row gutter={[16, 16]}>
            {losses.map(loss => (
              <Col xs={24} sm={12} lg={8} key={loss.killmail_id}>
                <Card
                  size="small"
                  style={{ 
                    background: 'rgba(15, 17, 25, 0.6)',
                    border: '1px solid rgba(51, 65, 85, 0.5)',
                  }}
                  actions={[
                    <Tooltip title="在 zKillboard 查看详情" key="link">
                      <a
                        href={`https://zkillboard.com/kill/${loss.killmail_id}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <LinkOutlined /> 详情
                      </a>
                    </Tooltip>,
                    <Button
                      key="submit"
                      type="link"
                      onClick={() => openSubmitModal(loss)}
                      loading={submitting === loss.killmail_id}
                    >
                      <PlusOutlined /> 申请
                    </Button>
                  ]}
                >
                  <Card.Meta
                    title={
                      <Space>
                        <RocketOutlined style={{ color: '#3b82f6' }} />
                        <span>船只 ID: {loss.ship_type_id}</span>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Text type="secondary">
                          <ClockCircleOutlined style={{ marginRight: 8 }} />
                          {new Date(loss.killmail_time).toLocaleString()}
                        </Text>
                        <Text style={{ color: '#f59e0b' }}>
                          损失价值: {(loss.zkb?.totalValue / 1000000)?.toFixed(2) || '未知'} M ISK
                        </Text>
                      </Space>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      {/* 提交申请弹窗 */}
      <Modal
        title={
          <Space>
            <PlusOutlined />
            <span>提交补损申请</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText="提交申请"
        cancelText="取消"
        confirmLoading={!!submitting}
      >
        {selectedLoss && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card size="small" style={{ background: 'rgba(15, 17, 25, 0.4)' }}>
              <Space direction="vertical" size={4}>
                <Text>船只 ID: <Text strong>{selectedLoss.ship_type_id}</Text></Text>
                <Text>击杀时间: <Text type="secondary">{new Date(selectedLoss.killmail_time).toLocaleString()}</Text></Text>
                <Text>损失价值: <Text style={{ color: '#f59e0b' }}>{(selectedLoss.zkb?.totalValue / 1000000)?.toFixed(2) || '未知'} M ISK</Text></Text>
              </Space>
            </Card>
            <div>
              <Text style={{ marginBottom: 8, display: 'block' }}>备注说明 (可选):</Text>
              <TextArea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="例如：舰队行动中被击毁..."
                rows={3}
              />
            </div>
          </Space>
        )}
      </Modal>
    </UserLayout>
  );
}

// 5. 我的申请页面
function MyRequests() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.charId || !user?.token) {
      navigate('/');
      return;
    }
    userApi.get(`/srp/my/${user.charId}`)
      .then(res => setRequests(res.data))
      .catch(err => {
        console.error(err);
        message.error('获取申请记录失败');
      })
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      title: '提交时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: '船只ID',
      dataIndex: 'ship_type_id',
      key: 'ship_type_id',
      width: 100,
    },
    {
      title: 'zKill链接',
      dataIndex: 'zkill_url',
      key: 'zkill_url',
      width: 100,
      render: (url) => (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <LinkOutlined /> 查看
        </a>
      ),
    },
    {
      title: '我的备注',
      dataIndex: 'player_comment',
      key: 'player_comment',
      ellipsis: true,
      render: (text) => text || <Text type="secondary">-</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      align: 'center',
      render: (status) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '管理员反馈',
      key: 'admin_feedback',
      render: (_, record) => (
        record.admin_comment ? (
          <Space direction="vertical" size={0}>
            <Text>{record.admin_comment}</Text>
            {record.reviewed_by && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                —— {record.reviewed_by}, {new Date(record.reviewed_at).toLocaleString()}
              </Text>
            )}
          </Space>
        ) : <Text type="secondary">-</Text>
      ),
    },
  ];

  if (!user.charId) return null;

  return (
    <UserLayout>
      <Card
        title={
          <Space>
            <FileTextOutlined />
            <span>我的补损申请</span>
          </Space>
        }
        extra={<Text type="secondary">查看申请进度和管理员反馈</Text>}
        style={{ 
          background: 'rgba(30, 41, 59, 0.6)',
          border: '1px solid rgba(51, 65, 85, 0.5)',
        }}
      >
        <Table
          columns={columns}
          dataSource={requests}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: <Empty description="暂无申请记录" /> }}
          scroll={{ x: 800 }}
        />
      </Card>
    </UserLayout>
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
  const [view, setView] = useState('requests');
  const [admins, setAdmins] = useState([]);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const login = async () => {
    if (!creds.username || !creds.password) {
      message.warning('请输入账号和密码');
      return;
    }
    setLoginLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/admin/login`, creds);
      localStorage.setItem('adminToken', res.data.token);
      setToken(res.data.token);
      setAdminInfo(res.data.admin);
      message.success('登录成功');
      fetchRequests(res.data.token);
    } catch (err) {
      // 处理速率限制错误
      if (err.response?.status === 429) {
        message.error(err.response.data?.error || '登录尝试次数过多，请稍后再试');
      } else {
        message.error('登录失败: ' + (err.response?.data?.error || '用户名或密码错误'));
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    setToken(null);
    setAdminInfo(null);
    message.info('已退出登录');
  };

  const fetchRequests = async (t, statusFilter = 'all') => {
    setLoading(true);
    try {
      const res = await adminApi.get('/admin/requests', {
        params: { status: statusFilter }
      });
      setRequests(res.data.requests);
      setStats(res.data.stats);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const res = await adminApi.get('/admin/admins');
      setAdmins(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReview = async (action) => {
    try {
      await adminApi.post('/admin/review', {
        id: reviewModal.id,
        action,
        adminComment
      });
      message.success(action === 'approve' ? '已批准' : '已拒绝');
      setReviewModal(null);
      setAdminComment('');
      fetchRequests(token, filter);
    } catch (err) {
      message.error('操作失败: ' + (err.response?.data?.error || '未知错误'));
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdmin.username || !newAdmin.password) {
      message.warning('请填写用户名和密码');
      return;
    }
    try {
      await adminApi.post('/admin/admins', newAdmin);
      setNewAdmin({ username: '', password: '' });
      fetchAdmins();
      message.success('添加成功');
    } catch (err) {
      // 显示密码强度错误详情
      const details = err.response?.data?.details;
      if (details && Array.isArray(details)) {
        message.error('添加失败: ' + details.join(', '));
      } else {
        message.error('添加失败: ' + (err.response?.data?.error || '未知错误'));
      }
    }
  };

  const handleDeleteAdmin = async (id) => {
    try {
      await adminApi.delete(`/admin/admins/${id}`);
      fetchAdmins();
      message.success('删除成功');
    } catch (err) {
      message.error('删除失败: ' + (err.response?.data?.error || '未知错误'));
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

  // 获取统计数据
  const getStatCount = (status) => {
    const stat = stats.find(s => s.status === status);
    return stat ? stat.count : 0;
  };

  const totalCount = getStatCount('pending') + getStatCount('approved') + getStatCount('rejected');

  // 登录界面
  if (!token) {
    return (
      <div className="login-background" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px'
      }}>
        <Card
          style={{ 
            width: 400,
            background: 'rgba(30, 41, 59, 0.9)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <SafetyCertificateOutlined style={{ fontSize: 48, color: '#3b82f6', marginBottom: 16 }} />
            <Title level={3} style={{ margin: 0, color: '#f1f5f9' }}>管理员登录</Title>
          </div>
          
          <Form layout="vertical" onFinish={login}>
            <Form.Item label="账号">
              <Input
                prefix={<UserOutlined />}
                placeholder="请输入账号"
                value={creds.username}
                onChange={e => setCreds({ ...creds, username: e.target.value })}
                size="large"
              />
            </Form.Item>
            
            <Form.Item label="密码">
              <Input.Password
                prefix={<SafetyCertificateOutlined />}
                placeholder="请输入密码"
                value={creds.password}
                onChange={e => setCreds({ ...creds, password: e.target.value })}
                onPressEnter={login}
                size="large"
              />
            </Form.Item>
            
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                block 
                size="large"
                loading={loginLoading}
                style={{ 
                  height: 48,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  border: 'none',
                }}
              >
                登录
              </Button>
            </Form.Item>
          </Form>
          
          <div style={{ textAlign: 'center' }}>
            <Link to="/">
              <Button type="link" icon={<HomeOutlined />}>返回首页</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // 申请管理表格列
  const requestColumns = [
    {
      title: '角色',
      dataIndex: 'char_name',
      key: 'char_name',
      width: 120,
      render: (name) => (
        <Space>
          <Avatar size="small" style={{ backgroundColor: '#3b82f6' }}>
            {name?.[0]}
          </Avatar>
          {name}
        </Space>
      ),
    },
    {
      title: '提交时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (text) => (
        <Text type="secondary" style={{ fontSize: 13 }}>
          {new Date(text).toLocaleString()}
        </Text>
      ),
    },
    {
      title: 'zKill',
      dataIndex: 'zkill_url',
      key: 'zkill_url',
      width: 80,
      render: (url) => (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <LinkOutlined /> 链接
        </a>
      ),
    },
    {
      title: '玩家备注',
      dataIndex: 'player_comment',
      key: 'player_comment',
      ellipsis: true,
      render: (text) => text || <Text type="secondary">-</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      align: 'center',
      render: (status) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '管理员备注',
      dataIndex: 'admin_comment',
      key: 'admin_comment',
      ellipsis: true,
      render: (text) => text || <Text type="secondary">-</Text>,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      align: 'center',
      render: (_, record) => (
        record.status === 'pending' ? (
          <Button
            type="primary"
            size="small"
            onClick={() => setReviewModal(record)}
          >
            审核
          </Button>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.reviewed_by}
          </Text>
        )
      ),
    },
  ];

  // 管理员表格列
  const adminColumns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={role === 'super_admin' ? 'blue' : 'default'}>
          {role === 'super_admin' ? '超级管理员' : '管理员'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        record.role !== 'super_admin' && (
          <Popconfirm
            title="确定要删除该管理员吗？"
            onConfirm={() => handleDeleteAdmin(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="primary" danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        )
      ),
    },
  ];

  const menuItems = [
    { key: 'requests', icon: <FileTextOutlined />, label: '申请管理' },
    ...(adminInfo?.role === 'super_admin' ? [
      { key: 'admins', icon: <TeamOutlined />, label: '管理员设置' }
    ] : []),
  ];

  return (
    <Layout className="eve-background" style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: 'rgba(15, 17, 25, 0.95)',
        borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginRight: 48 }}>
          <SafetyCertificateOutlined style={{ fontSize: 24, color: '#3b82f6', marginRight: 12 }} />
          <Title level={4} style={{ margin: 0, color: '#f1f5f9' }}>SRP 管理后台</Title>
        </div>
        
        <Menu
          mode="horizontal"
          selectedKeys={[view]}
          items={menuItems}
          onClick={({ key }) => setView(key)}
          style={{ 
            flex: 1, 
            background: 'transparent', 
            borderBottom: 'none',
            minWidth: 0,
          }}
        />
        
        <Space size={16}>
          <Avatar 
            style={{ backgroundColor: '#8b5cf6' }} 
            icon={<UserOutlined />}
          />
          <Text style={{ color: '#94a3b8' }}>
            {adminInfo?.username} 
            <Tag color="blue" style={{ marginLeft: 8 }}>
              {adminInfo?.role === 'super_admin' ? '超级管理员' : '管理员'}
            </Tag>
          </Text>
          <Button 
            type="text" 
            icon={<LogoutOutlined />} 
            onClick={logout}
            style={{ color: '#94a3b8' }}
          >
            退出
          </Button>
        </Space>
      </Header>
      
      <Content style={{ padding: '24px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        {/* 申请管理视图 */}
        {view === 'requests' && (
          <>
            {/* 统计卡片 */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={12} sm={6}>
                <Card 
                  hoverable
                  onClick={() => { setFilter('all'); fetchRequests(token, 'all'); }}
                  style={{ 
                    background: filter === 'all' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                    border: filter === 'all' ? '1px solid #3b82f6' : '1px solid rgba(51, 65, 85, 0.5)',
                    cursor: 'pointer',
                  }}
                >
                  <Statistic 
                    title={<Text type="secondary">全部</Text>}
                    value={totalCount}
                    valueStyle={{ color: '#f1f5f9' }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card 
                  hoverable
                  onClick={() => { setFilter('pending'); fetchRequests(token, 'pending'); }}
                  style={{ 
                    background: filter === 'pending' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                    border: filter === 'pending' ? '1px solid #f59e0b' : '1px solid rgba(51, 65, 85, 0.5)',
                    borderLeft: '4px solid #f59e0b',
                    cursor: 'pointer',
                  }}
                >
                  <Statistic 
                    title={<Text type="secondary">待审核</Text>}
                    value={getStatCount('pending')}
                    valueStyle={{ color: '#f59e0b' }}
                    prefix={<ClockCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card 
                  hoverable
                  onClick={() => { setFilter('approved'); fetchRequests(token, 'approved'); }}
                  style={{ 
                    background: filter === 'approved' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                    border: filter === 'approved' ? '1px solid #10b981' : '1px solid rgba(51, 65, 85, 0.5)',
                    borderLeft: '4px solid #10b981',
                    cursor: 'pointer',
                  }}
                >
                  <Statistic 
                    title={<Text type="secondary">已批准</Text>}
                    value={getStatCount('approved')}
                    valueStyle={{ color: '#10b981' }}
                    prefix={<CheckCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card 
                  hoverable
                  onClick={() => { setFilter('rejected'); fetchRequests(token, 'rejected'); }}
                  style={{ 
                    background: filter === 'rejected' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                    border: filter === 'rejected' ? '1px solid #ef4444' : '1px solid rgba(51, 65, 85, 0.5)',
                    borderLeft: '4px solid #ef4444',
                    cursor: 'pointer',
                  }}
                >
                  <Statistic 
                    title={<Text type="secondary">已拒绝</Text>}
                    value={getStatCount('rejected')}
                    valueStyle={{ color: '#ef4444' }}
                    prefix={<CloseCircleOutlined />}
                  />
                </Card>
              </Col>
            </Row>

            {/* 申请列表 */}
            <Card
              title={
                <Space>
                  <FileTextOutlined />
                  <span>
                    {filter === 'all' ? '全部申请' : 
                     filter === 'pending' ? '待审核' : 
                     filter === 'approved' ? '已批准' : '已拒绝'}
                  </span>
                </Space>
              }
              style={{ 
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(51, 65, 85, 0.5)',
              }}
            >
              <Table
                columns={requestColumns}
                dataSource={requests}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: <Empty description="暂无数据" /> }}
                scroll={{ x: 900 }}
              />
            </Card>
          </>
        )}

        {/* 管理员设置视图 */}
        {view === 'admins' && (
          <Card
            title={
              <Space>
                <TeamOutlined />
                <span>管理员管理</span>
              </Space>
            }
            style={{ 
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(51, 65, 85, 0.5)',
            }}
          >
            {/* 添加管理员 */}
            <Card
              size="small"
              style={{ 
                marginBottom: 24,
                background: 'rgba(15, 17, 25, 0.4)',
                border: '1px solid rgba(51, 65, 85, 0.5)',
              }}
            >
              <Space wrap>
                <Input
                  placeholder="用户名"
                  value={newAdmin.username}
                  onChange={e => setNewAdmin({ ...newAdmin, username: e.target.value })}
                  style={{ width: 200 }}
                  prefix={<UserOutlined />}
                />
                <Input.Password
                  placeholder="密码"
                  value={newAdmin.password}
                  onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })}
                  style={{ width: 200 }}
                />
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={handleAddAdmin}
                  style={{ background: '#10b981', borderColor: '#10b981' }}
                >
                  添加管理员
                </Button>
              </Space>
            </Card>

            {/* 管理员列表 */}
            <Table
              columns={adminColumns}
              dataSource={admins}
              rowKey="id"
              pagination={false}
            />
          </Card>
        )}

        {/* 审核弹窗 */}
        <Modal
          title={
            <Space>
              <FileTextOutlined />
              <span>审核申请</span>
            </Space>
          }
          open={!!reviewModal}
          onCancel={() => { setReviewModal(null); setAdminComment(''); }}
          footer={[
            <Button key="cancel" onClick={() => { setReviewModal(null); setAdminComment(''); }}>
              取消
            </Button>,
            <Button 
              key="reject" 
              danger 
              icon={<CloseCircleOutlined />}
              onClick={() => handleReview('reject')}
            >
              拒绝
            </Button>,
            <Button 
              key="approve" 
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleReview('approve')}
              style={{ background: '#10b981', borderColor: '#10b981' }}
            >
              批准
            </Button>,
          ]}
          width={520}
        >
          {reviewModal && (
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Card size="small" style={{ background: 'rgba(15, 17, 25, 0.4)' }}>
                <Space direction="vertical" size={8}>
                  <Text><UserOutlined style={{ marginRight: 8 }} />角色: <Text strong>{reviewModal.char_name}</Text></Text>
                  <Text>
                    <LinkOutlined style={{ marginRight: 8 }} />
                    zKill: <a href={reviewModal.zkill_url} target="_blank" rel="noopener noreferrer">{reviewModal.zkill_url}</a>
                  </Text>
                  <Text><FileTextOutlined style={{ marginRight: 8 }} />玩家备注: {reviewModal.player_comment || '无'}</Text>
                </Space>
              </Card>
              
              <div>
                <Text style={{ marginBottom: 8, display: 'block' }}>管理员建议/备注:</Text>
                <TextArea
                  value={adminComment}
                  onChange={e => setAdminComment(e.target.value)}
                  placeholder="可选：输入给玩家的反馈信息..."
                  rows={4}
                />
              </div>
            </Space>
          )}
        </Modal>
      </Content>
    </Layout>
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
