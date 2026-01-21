/**
 * SRP 登录页
 * 用户通过 EVE Online SSO 登录
 */

import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Card,
  Button,
  Space,
  Typography,
  Divider,
} from 'antd';
import {
  SettingOutlined,
  LoginOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { useLanguage } from '../../i18n/LanguageContext';
import { useConfig } from '../../contexts/ConfigContext';
import { getCorporationLogoUrl } from '../../utils/imageUtils';
import { hasLoggedInUsers } from '../../utils/userStorage';

const { Title, Text, Paragraph } = Typography;

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

export default SRPLogin;
