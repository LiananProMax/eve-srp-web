import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  ReloadOutlined,
} from '@ant-design/icons';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { ConfigProvider, useConfig } from './contexts/ConfigContext';
import { getCorporationLogoUrl } from './utils/imageUtils';
import Home from './pages/Home';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// === 多用户存储管理工具 ===
const USERS_STORAGE_KEY = 'srpUsers';
const OLD_USER_KEY = 'user';

// 迁移旧的单用户数据到新的多用户格式
const migrateOldUserData = () => {
  const oldUser = localStorage.getItem(OLD_USER_KEY);
  if (oldUser) {
    try {
      const userData = JSON.parse(oldUser);
      if (userData?.charId && userData?.token) {
        // 检查是否已迁移
        const existingUsers = localStorage.getItem(USERS_STORAGE_KEY);
        if (!existingUsers) {
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([userData]));
        }
        // 清除旧数据
        localStorage.removeItem(OLD_USER_KEY);
      }
    } catch (e) {
      localStorage.removeItem(OLD_USER_KEY);
    }
  }
};

// 获取所有已登录用户
const getUsers = () => {
  migrateOldUserData();
  try {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    if (stored) {
      const users = JSON.parse(stored);
      return Array.isArray(users) ? users : [];
    }
  } catch (e) {
    console.error('Failed to parse users:', e);
  }
  return [];
};

// 添加用户（如已存在则更新 token）
const addUser = (user) => {
  const users = getUsers();
  const existingIndex = users.findIndex(u => u.charId === user.charId);
  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  return users;
};

// 移除指定用户
const removeUser = (charId) => {
  const users = getUsers().filter(u => u.charId !== charId);
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  return users;
};

// 清除所有用户（退出登录）
const clearAllUsers = () => {
  localStorage.removeItem(USERS_STORAGE_KEY);
};

// 获取特定用户
const getUserByCharId = (charId) => {
  return getUsers().find(u => u.charId === charId);
};

// 检查是否有登录用户
const hasLoggedInUsers = () => {
  return getUsers().length > 0;
};

// 获取角色头像 URL
const getCharacterAvatarUrl = (charId, size = 64) => {
  return `https://images.evetech.net/characters/${charId}/portrait?size=${size}`;
};

// 获取船只渲染图 URL（3D 舰船图）
const getShipRenderUrl = (typeId, size = 256) => {
  return `https://images.evetech.net/types/${typeId}/render?size=${size}`;
};

// 获取船只图标 URL
const getShipIconUrl = (typeId, size = 64) => {
  return `https://images.evetech.net/types/${typeId}/icon?size=${size}`;
};

// === 船只名称缓存和获取 ===
const SHIP_NAMES_CACHE_KEY = 'eve_ship_names';
const SHIP_NAMES_CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 缓存7天

// 获取缓存的船只名称
const getShipNamesCache = () => {
  try {
    const cached = localStorage.getItem(SHIP_NAMES_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      if (Date.now() - data.timestamp < SHIP_NAMES_CACHE_EXPIRY) {
        return data.names || {};
      }
    }
  } catch (e) {
    console.error('Failed to parse ship names cache:', e);
  }
  return {};
};

// 保存船只名称到缓存
const saveShipNamesCache = (names) => {
  try {
    const existing = getShipNamesCache();
    const merged = { ...existing, ...names };
    localStorage.setItem(SHIP_NAMES_CACHE_KEY, JSON.stringify({
      names: merged,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.error('Failed to save ship names cache:', e);
  }
};

// 批量获取船只名称（使用 POST /universe/names/，只返回英文）
const fetchShipNames = async (typeIds) => {
  if (!typeIds || typeIds.length === 0) return {};
  
  // 去重
  const uniqueIds = [...new Set(typeIds.map(id => parseInt(id)))].filter(id => id > 0);
  if (uniqueIds.length === 0) return {};
  
  // 检查缓存
  const cached = getShipNamesCache();
  const uncachedIds = uniqueIds.filter(id => !cached[id]);
  
  // 如果全部都在缓存中，直接返回
  if (uncachedIds.length === 0) {
    const result = {};
    uniqueIds.forEach(id => {
      result[id] = cached[id];
    });
    return result;
  }
  
  try {
    // 使用 ESI 批量获取名称
    const response = await axios.post(
      'https://esi.evetech.net/latest/universe/names/',
      uncachedIds,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    // 处理响应
    const newNames = {};
    response.data.forEach(item => {
      if (item.category === 'inventory_type') {
        newNames[item.id] = item.name;
      }
    });
    
    // 保存到缓存
    if (Object.keys(newNames).length > 0) {
      saveShipNamesCache(newNames);
    }
    
    // 合并缓存和新获取的数据
    const result = {};
    uniqueIds.forEach(id => {
      result[id] = newNames[id] || cached[id] || `Type ${id}`;
    });
    
    return result;
  } catch (error) {
    console.error('Failed to fetch ship names:', error);
    // 返回缓存中的数据 + 默认值
    const result = {};
    uniqueIds.forEach(id => {
      result[id] = cached[id] || `Type ${id}`;
    });
    return result;
  }
};

// 自定义 Hook：获取船只名称（英文）
const useShipNames = (typeIds) => {
  const [names, setNames] = useState({});
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (!typeIds || typeIds.length === 0) return;
    
    const loadNames = async () => {
      setLoading(true);
      const fetchedNames = await fetchShipNames(typeIds);
      setNames(fetchedNames);
      setLoading(false);
    };
    
    loadNames();
  }, [typeIds.join(',')]);
  
  return { names, loading };
};

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
      // 如果请求中已经指定了 token，使用指定的 token
      if (config._userToken) {
        config.headers.Authorization = `Bearer ${config._userToken}`;
        return config;
      }
      
      if (tokenKey === 'user' || tokenKey === USERS_STORAGE_KEY) {
        // 多用户模式：使用第一个用户的 token 作为默认
        const users = getUsers();
        if (users.length > 0) {
          config.headers.Authorization = `Bearer ${users[0].token}`;
        }
      } else {
        const stored = localStorage.getItem(tokenKey);
        if (stored) {
          config.headers.Authorization = `Bearer ${stored}`;
        }
      }
    } catch (e) {
      console.error('Token parsing error:', e);
    }
    return config;
  });
  
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401 || error.response?.status === 403) {
        const errorMsg = error.response?.data?.error || '';
        if (errorMsg.includes('token') || errorMsg.includes('Token') || errorMsg.includes('凭证')) {
          if (tokenKey === 'user' || tokenKey === USERS_STORAGE_KEY) {
            // 多用户模式下，token 过期只移除对应用户
            // 如果所有用户都失效，则跳转登录页
            if (getUsers().length === 0) {
              window.location.href = '/srp';
            }
          } else {
            localStorage.removeItem(tokenKey);
            window.location.href = '/admin';
          }
        }
      }
      return Promise.reject(error);
    }
  );
  
  return instance;
};

// 创建带指定用户 token 的请求配置
const withUserToken = (token) => ({ _userToken: token });

const userApi = createAuthAxios(USERS_STORAGE_KEY);
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
  const navigate = useNavigate();
  const corpLogoUrl = getCorporationLogoUrl(config.corpId, 128);
  
  // 检查是否已登录，如果已登录则跳转到 dashboard
  useEffect(() => {
    if (hasLoggedInUsers()) {
      navigate('/dashboard');
    }
  }, [navigate]);
  
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
  const { t } = useLanguage();

  useEffect(() => {
    if (code && !hasRequested.current) {
      hasRequested.current = true;
      axios.post(`${API_BASE}/auth/eve`, { code })
        .then(res => {
          const newUser = {
            charId: res.data.charId,
            charName: res.data.charName,
            token: res.data.token
          };
          // 追加用户到列表（而非覆盖）
          const users = addUser(newUser);
          const isNewAccount = users.length > 1;
          
          if (isNewAccount) {
            message.success(t?.srp?.accountAdded?.replace('{name}', newUser.charName) || `已添加角色: ${newUser.charName}`);
          } else {
            message.success(t?.srp?.loginSuccess || '登录成功！');
          }
          navigate('/dashboard');
        })
        .catch(err => {
          message.error((t?.srp?.loginFailed || '登录失败') + '：' + (err.response?.data?.error || t?.srp?.notCorpMember || '非本军团成员'));
          // 如果已有其他账号，返回 dashboard；否则返回登录页
          if (hasLoggedInUsers()) {
            navigate('/dashboard');
          } else {
            navigate('/srp');
          }
        });
    }
  }, [code, navigate, t]);

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
          {t?.srp?.verifying || '正在验证身份...'}
        </Title>
        <Text type="secondary">{t?.srp?.verifyingDesc || '请稍候，正在与 EVE Online 服务器通信'}</Text>
      </Card>
    </div>
  );
}

// 3. 用户布局组件（多账号版本）
function UserLayout({ children }) {
  const users = getUsers();
  const primaryUser = users[0] || {};
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { config } = useConfig();
  const corpLogoUrl = getCorporationLogoUrl(config.corpId, 64);

  const handleLogout = () => {
    clearAllUsers();
    // 清除所有角色的缓存
    users.forEach(user => {
      sessionStorage.removeItem(getLossesCacheKey(user.charId));
    });
    message.info(t?.srp?.loggedOut || '已退出登录');
    navigate('/srp');
  };

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: t?.nav?.home || '首页' },
    { key: '/dashboard', icon: <PlusOutlined />, label: t?.nav?.srp || '补损申请' },
    { key: '/my-requests', icon: <FileTextOutlined />, label: t?.nav?.myRequests || '我的申请' },
  ];

  // 用户下拉菜单项
  const userMenuItems = [
    ...(users.length > 1 ? [
      {
        key: 'accounts-header',
        label: <Text type="secondary" style={{ fontSize: 12 }}>{t?.srp?.loggedInAccounts || '已登录角色'} ({users.length})</Text>,
        disabled: true,
      },
      { type: 'divider' },
      ...users.map(user => ({
        key: `user-${user.charId}`,
        label: (
          <Space>
            <Avatar src={getCharacterAvatarUrl(user.charId, 32)} size="small" />
            <span>{user.charName}</span>
          </Space>
        ),
        disabled: true,
      })),
      { type: 'divider' },
    ] : []),
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t?.srp?.logoutAll || '退出所有账号',
      danger: true,
      onClick: handleLogout,
    },
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
          <Title level={4} style={{ margin: 0, color: '#f1f5f9' }}>{t?.srp?.srpSystem || 'SRP 系统'}</Title>
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
          {/* 显示所有已登录角色的头像 */}
          <Avatar.Group maxCount={3} size="small">
            {users.map(user => (
              <Tooltip key={user.charId} title={user.charName}>
                <Avatar 
                  src={getCharacterAvatarUrl(user.charId, 64)}
                  style={{ border: '2px solid #3b82f6' }}
                />
              </Tooltip>
            ))}
          </Avatar.Group>
          
          <Select
            value={null}
            placeholder={
              <Space>
                <Text style={{ color: '#94a3b8' }}>
                  {t?.srp?.welcome || '欢迎'}, <Text strong style={{ color: '#f1f5f9' }}>{primaryUser.charName}</Text>
                </Text>
                {users.length > 1 && (
                  <Tag color="blue" style={{ marginLeft: 4 }}>+{users.length - 1}</Tag>
                )}
              </Space>
            }
            dropdownRender={() => (
              <Menu items={userMenuItems} style={{ background: 'transparent' }} />
            )}
            style={{ 
              minWidth: 180,
              background: 'transparent',
            }}
            popupClassName="user-dropdown"
            bordered={false}
            suffixIcon={null}
            open={undefined}
          />
        </Space>
      </Header>
      
      <Content style={{ padding: '24px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        {children}
      </Content>
    </Layout>
  );
}

// 缓存键名前缀
const LOSSES_CACHE_PREFIX = 'srp_losses_';
const LOSSES_CACHE_EXPIRY = 10 * 60 * 1000; // 缓存10分钟
const INITIAL_DISPLAY_COUNT = 15; // 初始显示数量 (3行 x 5列)
const LOAD_MORE_COUNT = 15; // 每次加载更多的数量

// 获取角色的缓存键
const getLossesCacheKey = (charId) => `${LOSSES_CACHE_PREFIX}${charId}`;

// 4. 用户面板：选择损失（多账号版本）
function Dashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [losses, setLosses] = useState([]); // 合并后的所有损失
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLoss, setSelectedLoss] = useState(null);
  const [comment, setComment] = useState('');
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);
  const { t } = useLanguage();
  const { config } = useConfig();
  
  // 获取所有损失中的船只 ID
  const shipTypeIds = useMemo(() => {
    return losses.map(loss => loss.ship_type_id);
  }, [losses]);
  
  // 获取船只名称（英文）
  const { names: shipNames } = useShipNames(shipTypeIds);

  // 初始化用户列表
  useEffect(() => {
    const currentUsers = getUsers();
    if (currentUsers.length === 0) {
      navigate('/srp');
      return;
    }
    setUsers(currentUsers);
  }, [navigate]);

  // 从 API 获取单个角色的损失数据
  const fetchLossesForUser = async (user) => {
    try {
      const res = await userApi.get(`/losses/${user.charId}`, withUserToken(user.token));
      // 为每条损失添加角色信息
      const lossesWithUser = res.data.map(loss => ({
        ...loss,
        _charId: user.charId,
        _charName: user.charName,
        _token: user.token
      }));
      
      // 保存到缓存
      const cacheData = {
        data: lossesWithUser,
        timestamp: Date.now()
      };
      sessionStorage.setItem(getLossesCacheKey(user.charId), JSON.stringify(cacheData));
      
      return lossesWithUser;
    } catch (err) {
      console.error(`获取 ${user.charName} 的损失记录失败:`, err);
      // 如果是 token 失效，移除该用户
      if (err.response?.status === 401 || err.response?.status === 403) {
        message.warning(`${user.charName} 的登录已过期，请重新添加`);
        const newUsers = removeUser(user.charId);
        setUsers(newUsers);
      }
      return [];
    }
  };

  // 获取所有角色的损失数据
  const fetchAllLosses = async (showRefreshMessage = false, forceRefresh = false) => {
    if (users.length === 0) return;
    
    const allLosses = [];
    
    await Promise.all(users.map(async (user) => {
      // 检查缓存
      if (!forceRefresh) {
        const cached = sessionStorage.getItem(getLossesCacheKey(user.charId));
        if (cached) {
          try {
            const cacheData = JSON.parse(cached);
            if (Date.now() - cacheData.timestamp < LOSSES_CACHE_EXPIRY) {
              allLosses.push(...cacheData.data);
              return;
            }
          } catch (e) {
            sessionStorage.removeItem(getLossesCacheKey(user.charId));
          }
        }
      }
      
      // 从 API 获取
      const userLosses = await fetchLossesForUser(user);
      allLosses.push(...userLosses);
    }));
    
    // 按时间排序（最新的在前）
    allLosses.sort((a, b) => new Date(b.killmail_time) - new Date(a.killmail_time));
    
    setLosses(allLosses);
    setLastFetchTime(new Date());
    
    if (showRefreshMessage) {
      message.success(t?.srp?.lossesRefreshed || '损失记录已刷新');
    }
  };

  // 手动刷新
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllLosses(true, true);
    setDisplayCount(INITIAL_DISPLAY_COUNT);
    setRefreshing(false);
  };

  // 用户列表变化时获取损失
  useEffect(() => {
    if (users.length > 0) {
      setLoading(true);
      fetchAllLosses().finally(() => setLoading(false));
    }
  }, [users]);

  // 添加新账号
  const handleAddAccount = () => {
    if (!config.eveClientId || !config.callbackUrl) {
      message.error('SSO 配置未加载');
      return;
    }
    const url = `https://login.eveonline.com/v2/oauth/authorize/?response_type=code&redirect_uri=${encodeURIComponent(config.callbackUrl)}&client_id=${config.eveClientId}&state=add_account`;
    window.location.href = url;
  };

  // 移除账号
  const handleRemoveAccount = (charId, charName) => {
    const newUsers = removeUser(charId);
    setUsers(newUsers);
    // 清除该用户的缓存
    sessionStorage.removeItem(getLossesCacheKey(charId));
    // 从损失列表中移除该用户的损失
    setLosses(prev => prev.filter(loss => loss._charId !== charId));
    message.success(`${t?.srp?.accountRemoved?.replace('{name}', charName) || `已移除角色: ${charName}`}`);
    
    // 如果没有用户了，跳转到登录页
    if (newUsers.length === 0) {
      navigate('/srp');
    }
  };

  const openSubmitModal = (loss) => {
    setSelectedLoss(loss);
    setComment('');
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!selectedLoss) return;
    
    setSubmitting(selectedLoss.killmail_id);
    try {
      // 使用该损失对应角色的 token 提交
      await userApi.post('/srp', {
        lossMail: selectedLoss,
        comment
      }, withUserToken(selectedLoss._token));
      message.success(t?.srp?.submitSuccess || '申请提交成功！');
      setModalVisible(false);
    } catch (err) {
      message.error((t?.srp?.submitFailed || '提交失败') + ': ' + (err.response?.data?.error || '未知错误'));
    } finally {
      setSubmitting(null);
    }
  };

  if (users.length === 0) return null;

  return (
    <UserLayout>
      {/* 多账号管理区域 */}
      <Card
        size="small"
        style={{ 
          marginBottom: 16,
          background: 'rgba(30, 41, 59, 0.6)',
          border: '1px solid rgba(51, 65, 85, 0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Text style={{ color: '#94a3b8', marginRight: 8 }}>
            {t?.srp?.loggedInAccounts || '已登录角色'}:
          </Text>
          {users.map(user => (
            <Tag
              key={user.charId}
              closable
              onClose={(e) => {
                e.preventDefault();
                Modal.confirm({
                  title: t?.srp?.confirmRemoveAccount || '确认移除账号',
                  content: `${t?.srp?.confirmRemoveAccountDesc?.replace('{name}', user.charName) || `确定要移除 ${user.charName} 吗？`}`,
                  okText: t?.admin?.confirm || '确定',
                  cancelText: t?.srp?.cancel || '取消',
                  onOk: () => handleRemoveAccount(user.charId, user.charName)
                });
              }}
              style={{ 
                padding: '4px 8px', 
                display: 'flex', 
                alignItems: 'center',
                background: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
              }}
            >
              <Avatar 
                src={getCharacterAvatarUrl(user.charId, 32)} 
                size={20} 
                style={{ marginRight: 6 }}
              />
              <span style={{ color: '#f1f5f9' }}>{user.charName}</span>
            </Tag>
          ))}
          <Button
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleAddAccount}
            style={{ borderColor: '#3b82f6', color: '#3b82f6' }}
          >
            {t?.srp?.addAccount || '添加账号'}
          </Button>
        </div>
      </Card>

      <Card
        title={
          <Space>
            <PlusOutlined />
            <span>{t?.srp?.applyTitle || '申请补损'}</span>
            {users.length > 1 && (
              <Tag color="blue">{users.length} {t?.srp?.accountsTotal || '个账号'}</Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            {lastFetchTime && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t?.srp?.lastUpdate || '上次更新'}: {lastFetchTime.toLocaleTimeString()}
              </Text>
            )}
            <Tooltip title={t?.srp?.refreshLosses || '刷新损失记录'}>
              <Button
                type="text"
                icon={<ReloadOutlined spin={refreshing} />}
                onClick={handleRefresh}
                loading={refreshing}
                disabled={loading}
              />
            </Tooltip>
          </Space>
        }
        style={{ 
          background: 'rgba(30, 41, 59, 0.6)',
          border: '1px solid rgba(51, 65, 85, 0.5)',
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
            <Paragraph style={{ marginTop: 16 }}>{t?.srp?.fetchingLosses || '正在获取数据...'}</Paragraph>
          </div>
        ) : losses.length === 0 ? (
          <Empty 
            description={t?.srp?.noLosses || '暂无损失记录'} 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <>
            <Row gutter={[16, 16]}>
              {losses.slice(0, displayCount).map(loss => (
                <Col xs={24} sm={12} lg={8} key={`${loss._charId}-${loss.killmail_id}`}>
                  <Card
                    size="small"
                    style={{ 
                      background: 'rgba(15, 17, 25, 0.6)',
                      border: '1px solid rgba(51, 65, 85, 0.5)',
                      overflow: 'hidden',
                    }}
                    cover={
                      <div style={{ 
                        position: 'relative',
                        height: 140,
                        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.9) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}>
                        <img
                          src={getShipRenderUrl(loss.ship_type_id, 256)}
                          alt={`Ship ${loss.ship_type_id}`}
                          style={{
                            maxHeight: '120%',
                            maxWidth: '120%',
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 4px 12px rgba(59, 130, 246, 0.3))',
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        {/* 多账号时显示角色头像 */}
                        {users.length > 1 && (
                          <Tooltip title={loss._charName}>
                            <Avatar 
                              src={getCharacterAvatarUrl(loss._charId, 64)} 
                              size={32}
                              style={{ 
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                border: '2px solid #3b82f6',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                              }}
                            />
                          </Tooltip>
                        )}
                        {/* 损失价值标签 */}
                        <Tag 
                          style={{ 
                            position: 'absolute',
                            bottom: 8,
                            right: 8,
                            background: 'rgba(245, 158, 11, 0.9)',
                            border: 'none',
                            color: '#fff',
                            fontWeight: 'bold',
                          }}
                        >
                          {loss.zkb?.totalValue ? formatISK(Math.round(loss.zkb.totalValue)) : '?'} ISK
                        </Tag>
                      </div>
                    }
                    actions={[
                      <Tooltip title={t?.srp?.viewOnZkill || '在 zKillboard 查看详情'} key="link">
                        <a
                          href={`https://zkillboard.com/kill/${loss.killmail_id}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <LinkOutlined /> {t?.srp?.view || '详情'}
                        </a>
                      </Tooltip>,
                      <Button
                        key="submit"
                        type="link"
                        onClick={() => openSubmitModal(loss)}
                        loading={submitting === loss.killmail_id}
                      >
                        <PlusOutlined /> {t?.srp?.apply || '申请'}
                      </Button>
                    ]}
                  >
                    <Card.Meta
                      title={
                        <Text strong style={{ color: '#f1f5f9', fontSize: 14 }}>
                          {shipNames[loss.ship_type_id] || `Type ${loss.ship_type_id}`}
                        </Text>
                      }
                      description={
                        <Space direction="vertical" size={2} style={{ width: '100%' }}>
                          {users.length > 1 && (
                            <Text style={{ color: '#60a5fa', fontSize: 12 }}>
                              <UserOutlined style={{ marginRight: 4 }} />
                              {loss._charName}
                            </Text>
                          )}
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            <ClockCircleOutlined style={{ marginRight: 4 }} />
                            {new Date(loss.killmail_time).toLocaleString()}
                          </Text>
                        </Space>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
            
            {/* 加载更多 / 显示信息 */}
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              {displayCount < losses.length ? (
                <Button 
                  type="dashed" 
                  onClick={() => setDisplayCount(prev => prev + LOAD_MORE_COUNT)}
                  style={{ width: 200 }}
                >
                  {t?.srp?.loadMore || '加载更多'} ({losses.length - displayCount} {t?.srp?.remaining || '条剩余'})
                </Button>
              ) : (
                <Text type="secondary">
                  {t?.srp?.showingAll || '已显示全部'} {losses.length} {t?.srp?.records || '条记录'}
                </Text>
              )}
            </div>
          </>
        )}
      </Card>

      {/* 提交申请弹窗 */}
      <Modal
        title={
          <Space>
            <PlusOutlined />
            <span>{t?.srp?.submitModal || '提交补损申请'}</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={t?.srp?.submitButton || '提交申请'}
        cancelText={t?.srp?.cancel || '取消'}
        confirmLoading={!!submitting}
        width={480}
      >
        {selectedLoss && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {/* 船只图片展示 */}
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
              borderRadius: 8,
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}>
              <img
                src={getShipRenderUrl(selectedLoss.ship_type_id, 256)}
                alt={`Ship ${selectedLoss.ship_type_id}`}
                style={{
                  width: 100,
                  height: 100,
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 4px 12px rgba(59, 130, 246, 0.4))',
                }}
                onError={(e) => {
                  e.currentTarget.src = getShipIconUrl(selectedLoss.ship_type_id, 64);
                }}
              />
              <Space direction="vertical" size={4} style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#f1f5f9' }}>
                  {shipNames[selectedLoss.ship_type_id] || `Type ${selectedLoss.ship_type_id}`}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>ID: {selectedLoss.ship_type_id}</Text>
                <Space>
                  <Avatar 
                    src={getCharacterAvatarUrl(selectedLoss._charId, 32)} 
                    size="small"
                  />
                  <Text style={{ color: '#60a5fa' }}>{selectedLoss._charName}</Text>
                </Space>
                <Text style={{ color: '#f59e0b', fontSize: 16, fontWeight: 'bold' }}>
                  {selectedLoss.zkb?.totalValue ? formatISK(Math.round(selectedLoss.zkb.totalValue)) : '?'} ISK
                </Text>
              </Space>
            </div>

            <Card size="small" style={{ background: 'rgba(15, 17, 25, 0.4)' }}>
              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <Text type="secondary">{t?.srp?.killTime || '击杀时间'}</Text>
                  <div>
                    <Text style={{ color: '#f1f5f9' }}>
                      {new Date(selectedLoss.killmail_time).toLocaleString()}
                    </Text>
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Killmail ID</Text>
                  <div>
                    <a 
                      href={`https://zkillboard.com/kill/${selectedLoss.killmail_id}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#3b82f6' }}
                    >
                      {selectedLoss.killmail_id} <LinkOutlined />
                    </a>
                  </div>
                </Col>
              </Row>
            </Card>

            <div>
              <Text style={{ marginBottom: 8, display: 'block' }}>{t?.srp?.commentLabel || '备注说明 (可选)'}:</Text>
              <TextArea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder={t?.srp?.commentPlaceholder || '例如：舰队行动中被击毁...'}
                rows={3}
              />
            </div>
          </Space>
        )}
      </Modal>
    </UserLayout>
  );
}

// 5. 我的申请页面（多账号版本）
function MyRequests() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aggregatedStats, setAggregatedStats] = useState(null);
  const { t } = useLanguage();
  
  // 获取所有申请中的船只 ID
  const shipTypeIds = useMemo(() => {
    return requests.map(req => req.ship_type_id);
  }, [requests]);
  
  // 获取船只名称（英文）
  const { names: shipNames } = useShipNames(shipTypeIds);

  // 初始化用户列表
  useEffect(() => {
    const currentUsers = getUsers();
    if (currentUsers.length === 0) {
      navigate('/srp');
      return;
    }
    setUsers(currentUsers);
  }, [navigate]);

  // 获取所有角色的申请记录和统计
  useEffect(() => {
    if (users.length === 0) return;

    const fetchAllData = async () => {
      const allRequests = [];
      const statsData = {
        totalRequests: 0,
        approvedCount: 0,
        totalPayout: 0
      };

      await Promise.all(users.map(async (user) => {
        try {
          // 获取申请记录
          const reqRes = await userApi.get(`/srp/my/${user.charId}`, withUserToken(user.token));
          const userRequests = reqRes.data.map(req => ({
            ...req,
            _charId: user.charId,
            _charName: user.charName
          }));
          allRequests.push(...userRequests);

          // 获取统计
          const statsRes = await userApi.get(`/srp/stats/${user.charId}`, withUserToken(user.token));
          statsData.totalRequests += statsRes.data.totalRequests || 0;
          statsData.approvedCount += statsRes.data.approvedCount || 0;
          statsData.totalPayout += statsRes.data.totalPayout || 0;
        } catch (err) {
          console.error(`获取 ${user.charName} 的数据失败:`, err);
          if (err.response?.status === 401 || err.response?.status === 403) {
            message.warning(`${user.charName} 的登录已过期`);
          }
        }
      }));

      // 按提交时间排序（最新的在前）
      allRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setRequests(allRequests);
      setAggregatedStats(statsData);
      setLoading(false);
    };

    fetchAllData();
  }, [users]);

  // 是否为多账号模式
  const isMultiAccount = users.length > 1;

  const columns = [
    // 多账号时显示角色列
    ...(isMultiAccount ? [{
      title: t?.srp?.character || '角色',
      dataIndex: '_charName',
      key: '_charName',
      width: 120,
      render: (name, record) => (
        <Space>
          <Avatar 
            src={getCharacterAvatarUrl(record._charId, 32)} 
            size="small"
          />
          <Text style={{ color: '#60a5fa' }}>{name}</Text>
        </Space>
      ),
    }] : []),
    {
      title: t?.srp?.ship || '舰船',
      dataIndex: 'ship_type_id',
      key: 'ship_type_id',
      width: 160,
      render: (typeId) => (
        <Space>
          <img
            src={getShipRenderUrl(typeId, 64)}
            alt={shipNames[typeId] || `Ship ${typeId}`}
            style={{
              width: 40,
              height: 40,
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            }}
            onError={(e) => {
              e.currentTarget.src = getShipIconUrl(typeId, 64);
            }}
          />
          <Space direction="vertical" size={0}>
            <Text style={{ color: '#f1f5f9', fontSize: 13 }}>
              {shipNames[typeId] || `Type ${typeId}`}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              ID: {typeId}
            </Text>
          </Space>
        </Space>
      ),
    },
    {
      title: t?.srp?.submitTime || '提交时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: t?.srp?.zkillLink || 'zKill链接',
      dataIndex: 'zkill_url',
      key: 'zkill_url',
      width: 100,
      render: (url) => (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <LinkOutlined /> {t?.srp?.view || '查看'}
        </a>
      ),
    },
    {
      title: t?.srp?.myComment || '我的备注',
      dataIndex: 'player_comment',
      key: 'player_comment',
      ellipsis: true,
      render: (text) => text || <Text type="secondary">-</Text>,
    },
    {
      title: t?.srp?.status || '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      align: 'center',
      render: (status) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
        return (
          <Tag color={config.color} icon={config.icon}>
            {t?.srp?.[status] || config.text}
          </Tag>
        );
      },
    },
    {
      title: t?.srp?.payoutAmount || '补损金额',
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
      title: t?.srp?.adminFeedback || '管理员反馈',
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

  if (users.length === 0) return null;

  return (
    <UserLayout>
      {/* 汇总统计卡片 */}
      {aggregatedStats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card 
              style={{ 
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(51, 65, 85, 0.5)',
              }}
            >
              <Statistic 
                title={
                  <Text type="secondary">
                    {t?.srp?.totalRequests || '总申请数'}
                    {isMultiAccount && <Tag color="blue" style={{ marginLeft: 8 }}>{users.length} {t?.srp?.accountsTotal || '个账号'}</Tag>}
                  </Text>
                }
                value={aggregatedStats.totalRequests}
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
                title={<Text type="secondary">{t?.srp?.approvedRequests || '已批准'}</Text>}
                value={aggregatedStats.approvedCount}
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
                title={<Text type="secondary">{t?.srp?.totalPayout || '累计补损'}</Text>}
                value={aggregatedStats.totalPayout}
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
            <span>{t?.srp?.myRequests || '我的申请'}</span>
            {isMultiAccount && (
              <Tag color="blue">{t?.srp?.allAccountsRequests || '所有账号'}</Tag>
            )}
          </Space>
        }
        extra={<Text type="secondary">{t?.srp?.myRequestsDesc || '查看申请进度和管理员反馈'}</Text>}
        style={{ 
          background: 'rgba(30, 41, 59, 0.6)',
          border: '1px solid rgba(51, 65, 85, 0.5)',
        }}
      >
        <Table
          columns={columns}
          dataSource={requests}
          rowKey={(record) => `${record._charId || record.char_id}-${record.id}`}
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: <Empty description={t?.srp?.noRequests || '暂无申请记录'} /> }}
          scroll={{ x: 900 }}
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
