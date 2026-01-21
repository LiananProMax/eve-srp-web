/**
 * 船只名称 Hook
 * 根据 typeIds 批量获取船只名称（英文）
 */

import { useState, useEffect } from 'react';
import { fetchShipNames } from '../utils/shipNameCache';

/**
 * 自定义 Hook：获取船只名称（英文）
 * @param {Array<number>} typeIds 船只类型 ID 数组
 * @returns {Object} { names: Object, loading: boolean }
 */
export const useShipNames = (typeIds) => {
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

export default useShipNames;
