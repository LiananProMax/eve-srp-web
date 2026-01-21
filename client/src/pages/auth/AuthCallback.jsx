/**
 * SSO 回调处理页
 * 处理 EVE Online SSO 认证回调
 */

import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Card,
  Spin,
  Typography,
  message,
} from 'antd';
import { useLanguage } from '../../i18n/LanguageContext';
import { API_BASE } from '../../api';
import { addUser, hasLoggedInUsers } from '../../utils/userStorage';

const { Title, Text } = Typography;

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

export default AuthCallback;
