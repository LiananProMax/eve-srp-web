import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// 默认配置（API 加载前的后备值）
// 注意：这些只是占位符，实际值从后端 /api/config 获取
const defaultConfig = {
  // EVE SSO 配置
  eveClientId: '',
  callbackUrl: '',
  // 军团信息（空值作为占位符）
  corpId: 0,
  corpName: '',
  corpTicker: '',
  allianceName: '',
  qqGroupLink: '',
  discordContactId: '',
  discordContactNickname: '',
  discordContactAvatar: '',
};

const ConfigContext = createContext(undefined);

// API 地址
const isDev = import.meta.env.DEV;
const API_BASE = isDev ? 'http://localhost:3001/api' : '/api';

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await axios.get(`${API_BASE}/config`);
        setConfig(res.data);
        setError(null);
      } catch (err) {
        console.error('获取配置失败，使用默认配置:', err);
        setError(err);
        // 保持使用默认配置
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loading, error }}>
      {children}
    </ConfigContext.Provider>
  );
}

// 自定义 Hook
export function useConfig() {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}

// 导出默认配置供需要的地方使用
export { defaultConfig };
