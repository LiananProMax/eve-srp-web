/**
 * 用户面板：选择损失（多账号版本）
 * 显示用户的损失记录并提交补损申请
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Tag,
  Space,
  Typography,
  Modal,
  Spin,
  Row,
  Col,
  Avatar,
  message,
  Empty,
  Tooltip,
  Input,
} from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  LinkOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useLanguage } from '../../i18n/LanguageContext';
import { useConfig } from '../../contexts/ConfigContext';
import { getShipRenderUrl, getShipIconUrl, getCharacterAvatarUrl } from '../../utils/imageUtils';
import { getUsers, addUser, removeUser } from '../../utils/userStorage';
import { formatISK } from '../../utils/formatters';
import { userApi, withUserToken } from '../../api';
import { useShipNames } from '../../hooks/useShipNames';
import UserLayout, { getLossesCacheKey } from '../../components/common/UserLayout';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// 缓存配置
const LOSSES_CACHE_EXPIRY = 10 * 60 * 1000; // 缓存10分钟
const INITIAL_DISPLAY_COUNT = 15; // 初始显示数量 (3行 x 5列)
const LOAD_MORE_COUNT = 15; // 每次加载更多的数量

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

export default Dashboard;
