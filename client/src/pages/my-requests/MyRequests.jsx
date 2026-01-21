/**
 * 我的申请页面（多账号版本）
 * 显示用户提交的所有补损申请及其状态
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Tag,
  Space,
  Typography,
  Statistic,
  Row,
  Col,
  Avatar,
  message,
  Empty,
} from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  LinkOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useLanguage } from '../../i18n/LanguageContext';
import { getShipRenderUrl, getShipIconUrl, getCharacterAvatarUrl } from '../../utils/imageUtils';
import { getUsers } from '../../utils/userStorage';
import { userApi, withUserToken } from '../../api';
import { useShipNames } from '../../hooks/useShipNames';
import { STATUS_CONFIG } from '../../constants/status';
import UserLayout from '../../components/common/UserLayout';

const { Text } = Typography;

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
        const IconComponent = config.Icon;
        return (
          <Tag color={config.color} icon={<IconComponent />}>
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

export default MyRequests;
