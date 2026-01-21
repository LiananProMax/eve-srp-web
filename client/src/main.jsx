import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import './index.css'
import App from './App.jsx'

// EVE Online 风格深色主题
const eveTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#3b82f6',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorInfo: '#3b82f6',
    colorBgBase: '#0f1119',
    colorBgContainer: '#1e293b',
    colorBgElevated: '#1e293b',
    colorBorder: '#334155',
    colorBorderSecondary: '#1e293b',
    borderRadius: 8,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Layout: {
      headerBg: '#0f1119',
      siderBg: '#0f1119',
      bodyBg: 'transparent',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
    },
    Card: {
      colorBgContainer: 'rgba(30, 41, 59, 0.8)',
    },
    Table: {
      headerBg: 'rgba(30, 41, 59, 0.6)',
      rowHoverBg: 'rgba(59, 130, 246, 0.1)',
    },
    Modal: {
      contentBg: '#1e293b',
      headerBg: '#1e293b',
    },
  },
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider theme={eveTheme} locale={zhCN}>
      <App />
    </ConfigProvider>
  </StrictMode>,
)
