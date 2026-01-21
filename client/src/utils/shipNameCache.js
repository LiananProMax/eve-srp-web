/**
 * 船只名称缓存工具
 * 通过 ESI API 批量获取并缓存船只名称
 */

import axios from 'axios';

const SHIP_NAMES_CACHE_KEY = 'eve_ship_names';
const SHIP_NAMES_CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 缓存7天

/**
 * 获取缓存的船只名称
 * @returns {Object} 船只名称映射 { typeId: name }
 */
export const getShipNamesCache = () => {
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

/**
 * 保存船只名称到缓存
 * @param {Object} names 船只名称映射
 */
export const saveShipNamesCache = (names) => {
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

/**
 * 批量获取船只名称（使用 POST /universe/names/，只返回英文）
 * @param {Array<number>} typeIds 船只类型 ID 数组
 * @returns {Promise<Object>} 船只名称映射
 */
export const fetchShipNames = async (typeIds) => {
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
