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
  Select,
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
  EditOutlined,
} from '@ant-design/icons';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { ConfigProvider, useConfig } from './contexts/ConfigContext';
import { getCorporationLogoUrl } from './utils/imageUtils';
import Home from './pages/Home';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// === 金额格式化工具 ===
// 格式化数字为千分位显示
const formatISK = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  if (isNaN(num)) return '';
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

// 解析格式化后的数字（去除逗号）
const parseISK = (value) => {
  if (!value) return 0;
  const cleaned = value.toString().replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

// === 环境配置 ===
const isDev = import.meta.env.DEV;
const API_BASE = isDev ? 'http://localhost:3001/api' : '/api';

// === 创建带认证的 axios 实例 ===
const createAuthAxios = (tokenKey = 'user') => {
  const instance = axios.create({ baseURL: API_BASE });
  
  instance.interceptors.request.use((config) => {
    try {
      const stored = localStorage.getItem(tokenKey);
      if (stored) {
        let token;
        if (tokenKey === 'user') {
          const data = JSON.parse(stored);
          token = data.token;
        } else {
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
      if (error.response?.status === 401 || error.response?.status === 403) {
        const errorMsg = error.response?.data?.error || '';
        if (errorMsg.includes('token') || errorMsg.includes('Token') || errorMsg.includes('凭证')) {
          localStorage.removeItem(tokenKey);
          if (tokenKey === 'user') {
            window.location.href = '/srp';
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

const userApi = createAuthAxios('user');
const adminApi = createAuthAxios('adminToken');

// 状态配置
const STATUS_CONFIG = {
  pending: { text: '待审核', color: 'warning', icon: <ClockCircleOutlined /> },
  approved: { text: '已批准', color: 'success', icon: <CheckCircleOutlined /> },
  rejected: { text: '已拒绝', color: 'error', icon: <CloseCircleOutlined /> }
};

// 1. SRP 登录页
function SRPLogin() {
  const { t } = useLanguage();
  const { config } = useConfig();
  const corpLogoUrl = getCorporationLogoUrl(config.corpId, 128);
  
  const handleLogin = () => {
    if (!config.eveClientId || !config.callbackUrl) {
      console.error('SSO 配置未加载');
      return;
    }
    const url = `https://login.eveonline.com/v2/oauth/authorize/?response_type=code&redirect_uri=${encodeURIComponent(config.callbackUrl)}&client_id=${config.eveClientId}&state=srp_login`;
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
        <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img 
            src={corpLogoUrl} 
            alt={config.corpName}
            style={{ 
              width: 80, 
              height: 80, 
              borderRadius: '50%', 
              border: '3px solid #3b82f6',
              marginBottom: 16,
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)'
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <Title level={2} style={{ margin: 0, color: '#f1f5f9' }}>
            {t.srp.loginTitle}
          </Title>
          <Text type="secondary" style={{ fontSize: 16 }}>
            {t.srp.loginSubtitle}
          </Text>
        </div>
        
        <Divider style={{ borderColor: 'rgba(148, 163, 184, 0.2)' }} />
        
        <Paragraph style={{ color: '#94a3b8', marginBottom: 32 }}>
          {t.srp.loginDesc}
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
          {t.srp.loginButton}
        </Button>
        
        <Divider style={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>其他入口</Text>
        </Divider>
        
        <Space>
          <Link to="/">
            <Button type="link" icon={<HomeOutlined />}>
              {t.nav.home}
            </Button>
          </Link>
          <Link to="/admin">
            <Button type="link" icon={<SettingOutlined />}>
              {t.srp.adminEntry}
            </Button>
          </Link>
        </Space>
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
    if (code && !hasRequested.current) {
      hasRequested.current = true;
      axios.post(`${API_BASE}/auth/eve`, { code })
        .then(res => {
          localStorage.setItem('user', JSON.stringify({
            charId: res.data.charId,
            charName: res.data.charName,
            token: res.data.token
          }));
          message.success('登录成功！');
          navigate('/dashboard');
        })
        .catch(err => {
          localStorage.removeItem('user');
          message.error('登录失败：' + (err.response?.data?.error || '非本军团成员'));
          navigate('/srp');
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
  const { t } = useLanguage();
  const { config } = useConfig();
  const corpLogoUrl = getCorporationLogoUrl(config.corpId, 64);

  const handleLogout = () => {
    localStorage.removeItem('user');
    message.info('已退出登录');
    navigate('/srp');
  };

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: t.nav.home },
    { key: '/dashboard', icon: <PlusOutlined />, label: t.nav.srp },
    { key: '/my-requests', icon: <FileTextOutlined />, label: t.nav.myRequests },
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
          {config.corpId ? (
            <img 
              src={corpLogoUrl} 
              alt={config.corpName}
              className="w-8 h-8 rounded-full border-2 border-eve/50 hover:border-eve transition-colors"
              style={{ marginRight: 12 }}
            />
          ) : (
            <RocketOutlined style={{ fontSize: 24, color: '#3b82f6', marginRight: 12 }} />
          )}
          <Title level={4} style={{ margin: 0, color: '#f1f5f9' }}>{t.srp.srpSystem}</Title>
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
            {t.srp.welcome}, <Text strong style={{ color: '#f1f5f9' }}>{user.charName}</Text>
          </Text>
          <Button 
            type="text" 
            icon={<LogoutOutlined />} 
            onClick={handleLogout}
            style={{ color: '#94a3b8' }}
          >
            {t.srp.logout}
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
  const { t } = useLanguage();

  useEffect(() => {
    if (!user?.charId || !user?.token) {
      navigate('/srp');
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
      await userApi.post('/srp', {
        lossMail: selectedLoss,
        comment
      });
      message.success(t.srp.submitSuccess);
      setModalVisible(false);
    } catch (err) {
      message.error(t.srp.submitFailed + ': ' + (err.response?.data?.error || '未知错误'));
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
            <span>{t.srp.applyTitle}</span>
          </Space>
        }
        extra={<Text type="secondary">{t.srp.applyDesc}</Text>}
        style={{ 
          background: 'rgba(30, 41, 59, 0.6)',
          border: '1px solid rgba(51, 65, 85, 0.5)',
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
            <Paragraph style={{ marginTop: 16 }}>{t.srp.fetchingLosses}</Paragraph>
          </div>
        ) : losses.length === 0 ? (
          <Empty 
            description={t.srp.noLosses} 
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
                        <span>{t.srp.shipId}: {loss.ship_type_id}</span>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Text type="secondary">
                          <ClockCircleOutlined style={{ marginRight: 8 }} />
                          {new Date(loss.killmail_time).toLocaleString()}
                        </Text>
                        <Text style={{ color: '#f59e0b' }}>
                          {t.srp.lossValue}: {(loss.zkb?.totalValue / 1000000)?.toFixed(2) || '未知'} M ISK
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
            <span>{t.srp.submitModal}</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={t.srp.submitButton}
        cancelText={t.srp.cancel}
        confirmLoading={!!submitting}
      >
        {selectedLoss && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card size="small" style={{ background: 'rgba(15, 17, 25, 0.4)' }}>
              <Space direction="vertical" size={4}>
                <Text>{t.srp.shipId}: <Text strong>{selectedLoss.ship_type_id}</Text></Text>
                <Text>击杀时间: <Text type="secondary">{new Date(selectedLoss.killmail_time).toLocaleString()}</Text></Text>
                <Text>{t.srp.lossValue}: <Text style={{ color: '#f59e0b' }}>{(selectedLoss.zkb?.totalValue / 1000000)?.toFixed(2) || '未知'} M ISK</Text></Text>
              </Space>
            </Card>
            <div>
              <Text style={{ marginBottom: 8, display: 'block' }}>{t.srp.commentLabel}:</Text>
              <TextArea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder={t.srp.commentPlaceholder}
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
  const [playerStats, setPlayerStats] = useState(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (!user?.charId || !user?.token) {
      navigate('/srp');
      return;
    }
    // 获取申请记录
    userApi.get(`/srp/my/${user.charId}`)
      .then(res => setRequests(res.data))
      .catch(err => {
        console.error(err);
        message.error('获取申请记录失败');
      })
      .finally(() => setLoading(false));
    
    // 获取玩家统计
    userApi.get(`/srp/stats/${user.charId}`)
      .then(res => setPlayerStats(res.data))
      .catch(err => console.error('获取统计失败:', err));
  }, []);

  const columns = [
    {
      title: t.srp.submitTime,
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: t.srp.shipId,
      dataIndex: 'ship_type_id',
      key: 'ship_type_id',
      width: 100,
    },
    {
      title: t.srp.zkillLink,
      dataIndex: 'zkill_url',
      key: 'zkill_url',
      width: 100,
      render: (url) => (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <LinkOutlined /> {t.srp.view}
        </a>
      ),
    },
    {
      title: t.srp.myComment,
      dataIndex: 'player_comment',
      key: 'player_comment',
      ellipsis: true,
      render: (text) => text || <Text type="secondary">-</Text>,
    },
    {
      title: t.srp.status,
      dataIndex: 'status',
      key: 'status',
      width: 120,
      align: 'center',
      render: (status) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
        return (
          <Tag color={config.color} icon={config.icon}>
            {t.srp[status] || config.text}
          </Tag>
        );
      },
    },
    {
      title: t.srp.payoutAmount || '补损金额',
      dataIndex: 'payout_amount',
      key: 'payout_amount',
      width: 130,
      align: 'right',
      render: (amount, record) => (
        record.status === 'approved' && amount > 0 ? (
          <Text style={{ color: '#10b981', fontWeight: 'bold' }}>{amount.toLocaleString()} ISK</Text>
        ) : (
          <Text type="secondary">-</Text>
        )
      ),
    },
    {
      title: t.srp.adminFeedback,
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
      {/* 玩家补损统计卡片 */}
      {playerStats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card 
              style={{ 
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(51, 65, 85, 0.5)',
              }}
            >
              <Statistic 
                title={<Text type="secondary">{t.srp.totalRequests || '总申请数'}</Text>}
                value={playerStats.totalRequests}
                valueStyle={{ color: '#f1f5f9' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card 
              style={{ 
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(51, 65, 85, 0.5)',
                borderLeft: '4px solid #10b981',
              }}
            >
              <Statistic 
                title={<Text type="secondary">{t.srp.approvedRequests || '已批准'}</Text>}
                value={playerStats.approvedCount}
                valueStyle={{ color: '#10b981' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card 
              style={{ 
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(51, 65, 85, 0.5)',
                borderLeft: '4px solid #f59e0b',
              }}
            >
              <Statistic 
                title={<Text type="secondary">{t.srp.totalPayout || '累计补损'}</Text>}
                value={playerStats.totalPayout}
                valueStyle={{ color: '#f59e0b' }}
                suffix="ISK"
                formatter={(value) => value.toLocaleString()}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Card
        title={
          <Space>
            <FileTextOutlined />
            <span>{t.srp.myRequests}</span>
          </Space>
        }
        extra={<Text type="secondary">{t.srp.myRequestsDesc}</Text>}
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
  const { t } = useLanguage();
  const { config } = useConfig();
  const corpLogoUrl = getCorporationLogoUrl(config.corpId, 64);
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [token, setToken] = useState(localStorage.getItem('adminToken'));
  const [adminInfo, setAdminInfo] = useState(null);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState([]);
  const [filter, setFilter] = useState('all');
  const [reviewModal, setReviewModal] = useState(null);
  const [adminComment, setAdminComment] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [view, setView] = useState('requests');
  const [admins, setAdmins] = useState([]);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [payoutStats, setPayoutStats] = useState(null);
  // 编辑弹窗状态
  const [editModal, setEditModal] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editPayoutAmount, setEditPayoutAmount] = useState('');
  const [editAdminComment, setEditAdminComment] = useState('');

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
        adminComment,
        payoutAmount: action === 'approve' ? parseISK(payoutAmount) : 0
      });
      message.success(action === 'approve' ? '已批准' : '已拒绝');
      setReviewModal(null);
      setAdminComment('');
      setPayoutAmount('');
      fetchRequests(token, filter);
      fetchPayoutStats();  // 刷新统计
    } catch (err) {
      message.error('操作失败: ' + (err.response?.data?.error || '未知错误'));
    }
  };

  const fetchPayoutStats = async () => {
    try {
      const res = await adminApi.get('/admin/payout-stats');
      setPayoutStats(res.data);
    } catch (err) {
      console.error('获取支出统计失败:', err);
    }
  };

  // 打开编辑弹窗
  const openEditModal = (record) => {
    setEditModal(record);
    setEditStatus(record.status);
    setEditPayoutAmount(record.payout_amount?.toString() || '0');
    setEditAdminComment(record.admin_comment || '');
  };

  // 关闭编辑弹窗
  const closeEditModal = () => {
    setEditModal(null);
    setEditStatus('');
    setEditPayoutAmount('');
    setEditAdminComment('');
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    try {
      await adminApi.put(`/admin/request/${editModal.id}`, {
        status: editStatus,
        payoutAmount: editStatus === 'approved' ? parseISK(editPayoutAmount) : 0,
        adminComment: editAdminComment
      });
      message.success('修改成功');
      closeEditModal();
      fetchRequests(token, filter);
      fetchPayoutStats();
    } catch (err) {
      message.error('修改失败: ' + (err.response?.data?.error || '未知错误'));
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
      fetchPayoutStats();
    }
  }, [token]);

  useEffect(() => {
    if (token && view === 'admins') {
      fetchAdmins();
    }
  }, [view]);

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
            <Title level={3} style={{ margin: 0, color: '#f1f5f9' }}>{t.admin.title}</Title>
          </div>
          
          <Form layout="vertical" onFinish={login}>
            <Form.Item label={t.admin.username}>
              <Input
                prefix={<UserOutlined />}
                placeholder="请输入账号"
                value={creds.username}
                onChange={e => setCreds({ ...creds, username: e.target.value })}
                size="large"
              />
            </Form.Item>
            
            <Form.Item label={t.admin.password}>
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
                {t.admin.loginButton}
              </Button>
            </Form.Item>
          </Form>
          
          <div style={{ textAlign: 'center' }}>
            <Link to="/">
              <Button type="link" icon={<HomeOutlined />}>{t.admin.backHome}</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const requestColumns = [
    {
      title: t.admin.character,
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
      title: t.admin.submitTime,
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
      title: t.admin.zkill,
      dataIndex: 'zkill_url',
      key: 'zkill_url',
      width: 80,
      render: (url) => (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <LinkOutlined /> {t.admin.link}
        </a>
      ),
    },
    {
      title: t.admin.playerComment,
      dataIndex: 'player_comment',
      key: 'player_comment',
      ellipsis: true,
      render: (text) => text || <Text type="secondary">-</Text>,
    },
    {
      title: t.admin.status,
      dataIndex: 'status',
      key: 'status',
      width: 110,
      align: 'center',
      render: (status) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
        return (
          <Tag color={config.color} icon={config.icon}>
            {t.admin[status] || config.text}
          </Tag>
        );
      },
    },
    {
      title: t.admin.payoutAmount || '补损金额',
      dataIndex: 'payout_amount',
      key: 'payout_amount',
      width: 130,
      align: 'right',
      render: (amount, record) => (
        record.status === 'approved' && amount > 0 ? (
          <Text style={{ color: '#f59e0b' }}>{amount.toLocaleString()} ISK</Text>
        ) : (
          <Text type="secondary">-</Text>
        )
      ),
    },
    {
      title: t.admin.adminComment,
      dataIndex: 'admin_comment',
      key: 'admin_comment',
      ellipsis: true,
      render: (text) => text || <Text type="secondary">-</Text>,
    },
    {
      title: t.admin.action,
      key: 'action',
      width: 140,
      align: 'center',
      render: (_, record) => (
        record.status === 'pending' ? (
          <Button
            type="primary"
            size="small"
            onClick={() => setReviewModal(record)}
          >
            {t.admin.review}
          </Button>
        ) : (
          <Space size={4}>
            <Tooltip title={t.admin.edit || '编辑'}>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEditModal(record)}
                style={{ color: '#3b82f6' }}
              />
            </Tooltip>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.reviewed_by}
            </Text>
          </Space>
        )
      ),
    },
  ];

  const adminColumns = [
    {
      title: t.admin.username,
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: t.admin.role,
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={role === 'super_admin' ? 'blue' : 'default'}>
          {role === 'super_admin' ? t.admin.superAdmin : t.admin.normalAdmin}
        </Tag>
      ),
    },
    {
      title: t.admin.createTime,
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: t.admin.action,
      key: 'action',
      width: 100,
      render: (_, record) => (
        record.role !== 'super_admin' && (
          <Popconfirm
            title={t.admin.confirmDelete}
            onConfirm={() => handleDeleteAdmin(record.id)}
            okText={t.admin.confirm}
            cancelText={t.srp.cancel}
          >
            <Button type="primary" danger size="small" icon={<DeleteOutlined />}>
              {t.admin.delete}
            </Button>
          </Popconfirm>
        )
      ),
    },
  ];

  const menuItems = [
    { key: 'requests', icon: <FileTextOutlined />, label: t.admin.requestManagement },
    ...(adminInfo?.role === 'super_admin' ? [
      { key: 'admins', icon: <TeamOutlined />, label: t.admin.adminSettings }
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
          {config.corpId ? (
            <img 
              src={corpLogoUrl} 
              alt={config.corpName}
              className="w-8 h-8 rounded-full border-2 border-eve/50 hover:border-eve transition-colors"
              style={{ marginRight: 12 }}
            />
          ) : (
            <SafetyCertificateOutlined style={{ fontSize: 24, color: '#3b82f6', marginRight: 12 }} />
          )}
          <Title level={4} style={{ margin: 0, color: '#f1f5f9' }}>{t.admin.dashboard}</Title>
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
              {adminInfo?.role === 'super_admin' ? t.admin.superAdmin : t.admin.normalAdmin}
            </Tag>
          </Text>
          <Button 
            type="text" 
            icon={<LogoutOutlined />} 
            onClick={logout}
            style={{ color: '#94a3b8' }}
          >
            {t.srp.logout}
          </Button>
        </Space>
      </Header>
      
      <Content style={{ padding: '24px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        {view === 'requests' && (
          <>
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
                    title={<Text type="secondary">{t.admin.all}</Text>}
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
                    title={<Text type="secondary">{t.admin.pending}</Text>}
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
                    title={<Text type="secondary">{t.admin.approved}</Text>}
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
                    title={<Text type="secondary">{t.admin.rejected}</Text>}
                    value={getStatCount('rejected')}
                    valueStyle={{ color: '#ef4444' }}
                    prefix={<CloseCircleOutlined />}
                  />
                </Card>
              </Col>
            </Row>

            {/* 补损支出统计 */}
            {payoutStats && (
              <Card
                title={
                  <Space>
                    <RocketOutlined />
                    <span>{t.admin.payoutStats || '补损支出统计'}</span>
                  </Space>
                }
                style={{ 
                  marginBottom: 24,
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(51, 65, 85, 0.5)',
                }}
              >
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={8}>
                    <Statistic 
                      title={<Text type="secondary">{t.admin.totalPayout || '总支出'}</Text>}
                      value={payoutStats.totals.totalPayout}
                      valueStyle={{ color: '#f59e0b' }}
                      suffix="ISK"
                      formatter={(value) => value.toLocaleString()}
                    />
                  </Col>
                  <Col xs={24} sm={8}>
                    <Statistic 
                      title={<Text type="secondary">{t.admin.approvedRequests || '已批准申请'}</Text>}
                      value={payoutStats.totals.approvedCount}
                      valueStyle={{ color: '#10b981' }}
                      suffix={`/ ${payoutStats.totals.totalRequests}`}
                    />
                  </Col>
                  <Col xs={24} sm={8}>
                    <Statistic 
                      title={<Text type="secondary">{t.admin.avgPayout || '平均补损'}</Text>}
                      value={payoutStats.totals.approvedCount > 0 ? Math.round(payoutStats.totals.totalPayout / payoutStats.totals.approvedCount) : 0}
                      valueStyle={{ color: '#3b82f6' }}
                      suffix="ISK"
                      formatter={(value) => value.toLocaleString()}
                    />
                  </Col>
                </Row>
                {payoutStats.byPlayer && payoutStats.byPlayer.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <Divider orientation="left" style={{ borderColor: 'rgba(51, 65, 85, 0.5)' }}>
                      <Text type="secondary">{t.admin.topPlayers || 'TOP 玩家补损'}</Text>
                    </Divider>
                    <Row gutter={[8, 8]}>
                      {payoutStats.byPlayer.slice(0, 5).map((player, index) => (
                        <Col key={player.char_id} xs={24} sm={12} md={8}>
                          <Card size="small" style={{ background: 'rgba(15, 17, 25, 0.4)' }}>
                            <Space>
                              <Tag color={index === 0 ? 'gold' : index === 1 ? 'silver' : 'default'}>
                                #{index + 1}
                              </Tag>
                              <Text strong>{player.char_name}</Text>
                            </Space>
                            <div style={{ marginTop: 4 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {player.request_count} 次 · {player.total_amount.toLocaleString()} ISK
                              </Text>
                            </div>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </div>
                )}
              </Card>
            )}

            <Card
              title={
                <Space>
                  <FileTextOutlined />
                  <span>
                    {filter === 'all' ? t.admin.all : 
                     filter === 'pending' ? t.admin.pending : 
                     filter === 'approved' ? t.admin.approved : t.admin.rejected}
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

        {view === 'admins' && (
          <Card
            title={
              <Space>
                <TeamOutlined />
                <span>{t.admin.adminManagement}</span>
              </Space>
            }
            style={{ 
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(51, 65, 85, 0.5)',
            }}
          >
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
                  placeholder={t.admin.username}
                  value={newAdmin.username}
                  onChange={e => setNewAdmin({ ...newAdmin, username: e.target.value })}
                  style={{ width: 200 }}
                  prefix={<UserOutlined />}
                />
                <Input.Password
                  placeholder={t.admin.password}
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
                  {t.admin.addAdmin}
                </Button>
              </Space>
            </Card>

            <Table
              columns={adminColumns}
              dataSource={admins}
              rowKey="id"
              pagination={false}
            />
          </Card>
        )}

        <Modal
          title={
            <Space>
              <FileTextOutlined />
              <span>{t.admin.reviewRequest}</span>
            </Space>
          }
          open={!!reviewModal}
          onCancel={() => { setReviewModal(null); setAdminComment(''); setPayoutAmount(''); }}
          footer={[
            <Button key="cancel" onClick={() => { setReviewModal(null); setAdminComment(''); setPayoutAmount(''); }}>
              {t.srp.cancel}
            </Button>,
            <Button 
              key="reject" 
              danger 
              icon={<CloseCircleOutlined />}
              onClick={() => handleReview('reject')}
            >
              {t.admin.reject}
            </Button>,
            <Button 
              key="approve" 
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleReview('approve')}
              style={{ background: '#10b981', borderColor: '#10b981' }}
            >
              {t.admin.approve}
            </Button>,
          ]}
          width={520}
        >
          {reviewModal && (
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Card size="small" style={{ background: 'rgba(15, 17, 25, 0.4)' }}>
                <Space direction="vertical" size={8}>
                  <Text><UserOutlined style={{ marginRight: 8 }} />{t.admin.character}: <Text strong>{reviewModal.char_name}</Text></Text>
                  <Text>
                    <LinkOutlined style={{ marginRight: 8 }} />
                    zKill: <a href={reviewModal.zkill_url} target="_blank" rel="noopener noreferrer">{reviewModal.zkill_url}</a>
                  </Text>
                  <Text><FileTextOutlined style={{ marginRight: 8 }} />{t.admin.playerComment}: {reviewModal.player_comment || '无'}</Text>
                </Space>
              </Card>

              <div>
                <Text style={{ marginBottom: 8, display: 'block' }}>{t.admin.payoutAmount || '补损金额 (ISK)'}:</Text>
                <Input
                  value={formatISK(payoutAmount)}
                  onChange={e => {
                    // 只允许输入数字和逗号
                    const val = e.target.value.replace(/[^0-9,]/g, '');
                    setPayoutAmount(val.replace(/,/g, ''));
                  }}
                  placeholder="输入补损金额，如 50,000,000"
                  suffix="ISK"
                  style={{ width: '100%' }}
                />
              </div>
              
              <div>
                <Text style={{ marginBottom: 8, display: 'block' }}>{t.admin.adminSuggestion}:</Text>
                <TextArea
                  value={adminComment}
                  onChange={e => setAdminComment(e.target.value)}
                  placeholder={t.admin.adminCommentPlaceholder}
                  rows={4}
                />
              </div>
            </Space>
          )}
        </Modal>

        {/* 编辑弹窗 */}
        <Modal
          title={
            <Space>
              <EditOutlined />
              <span>{t.admin.editRequest || '编辑申请'}</span>
            </Space>
          }
          open={!!editModal}
          onCancel={closeEditModal}
          footer={[
            <Button key="cancel" onClick={closeEditModal}>
              {t.srp.cancel}
            </Button>,
            <Button 
              key="save" 
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleSaveEdit}
            >
              {t.admin.save || '保存'}
            </Button>,
          ]}
          width={520}
        >
          {editModal && (
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Card size="small" style={{ background: 'rgba(15, 17, 25, 0.4)' }}>
                <Space direction="vertical" size={8}>
                  <Text><UserOutlined style={{ marginRight: 8 }} />{t.admin.character}: <Text strong>{editModal.char_name}</Text></Text>
                  <Text>
                    <LinkOutlined style={{ marginRight: 8 }} />
                    zKill: <a href={editModal.zkill_url} target="_blank" rel="noopener noreferrer">{editModal.zkill_url}</a>
                  </Text>
                  <Text><FileTextOutlined style={{ marginRight: 8 }} />{t.admin.playerComment}: {editModal.player_comment || '无'}</Text>
                </Space>
              </Card>

              <div>
                <Text style={{ marginBottom: 8, display: 'block' }}>{t.admin.status || '状态'}:</Text>
                <Select
                  value={editStatus}
                  onChange={setEditStatus}
                  style={{ width: '100%' }}
                  options={[
                    { value: 'pending', label: <Tag color="orange" icon={<ClockCircleOutlined />}>{t.admin.pending || '待审核'}</Tag> },
                    { value: 'approved', label: <Tag color="green" icon={<CheckCircleOutlined />}>{t.admin.approved || '已批准'}</Tag> },
                    { value: 'rejected', label: <Tag color="red" icon={<CloseCircleOutlined />}>{t.admin.rejected || '已拒绝'}</Tag> },
                  ]}
                />
              </div>

              {editStatus === 'approved' && (
                <div>
                  <Text style={{ marginBottom: 8, display: 'block' }}>{t.admin.payoutAmount || '补损金额 (ISK)'}:</Text>
                  <Input
                    value={formatISK(editPayoutAmount)}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9,]/g, '');
                      setEditPayoutAmount(val.replace(/,/g, ''));
                    }}
                    placeholder="输入补损金额，如 50,000,000"
                    suffix="ISK"
                    style={{ width: '100%' }}
                  />
                </div>
              )}
              
              <div>
                <Text style={{ marginBottom: 8, display: 'block' }}>{t.admin.adminSuggestion}:</Text>
                <TextArea
                  value={editAdminComment}
                  onChange={e => setEditAdminComment(e.target.value)}
                  placeholder={t.admin.adminCommentPlaceholder}
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
