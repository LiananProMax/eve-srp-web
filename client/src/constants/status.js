/**
 * 状态配置常量
 * 定义 SRP 申请的各种状态
 */

import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';

/**
 * 申请状态配置
 * icon 存储组件引用，使用时通过 React.createElement 或 JSX 渲染
 */
export const STATUS_CONFIG = {
  pending: { 
    text: '待审核', 
    color: 'warning', 
    Icon: ClockCircleOutlined
  },
  approved: { 
    text: '已批准', 
    color: 'success', 
    Icon: CheckCircleOutlined
  },
  rejected: { 
    text: '已拒绝', 
    color: 'error', 
    Icon: CloseCircleOutlined
  }
};
