/**
 * 用户布局组件
 * 用户端页面的通用布局，包含导航栏和内容区域
 */

import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Layout,
  Menu,
  Button,
  Tag,
  Space,
  Typography,
  Avatar,
  Tooltip,
  Select,
  message,
} from 'antd';
import {
  LogoutOutlined,
  FileTextOutlined,
  PlusOutlined,
  RocketOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { useLanguage } from '../../i18n/LanguageContext';
import { useConfig } from '../../contexts/ConfigContext';
import { getCorporationLogoUrl, getCharacterAvatarUrl } from '../../utils/imageUtils';
import { getUsers, clearAllUsers } from '../../utils/userStorage';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

// 缓存键名前缀（用于清除缓存）
const LOSSES_CACHE_PREFIX = 'srp_losses_';

// 获取角色的缓存键
const getLossesCacheKey = (charId) => `${LOSSES_CACHE_PREFIX}${charId}`;

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

export default UserLayout;

// 导出缓存相关的常量和函数，供其他组件使用
export { LOSSES_CACHE_PREFIX, getLossesCacheKey };
