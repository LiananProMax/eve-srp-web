/**
 * API 配置和 axios 实例
 * 统一管理所有 API 请求的配置
 */

import axios from 'axios';
import { getUsers, USERS_STORAGE_KEY } from '../utils/userStorage';

// 环境配置
const isDev = import.meta.env.DEV;
export const API_BASE = isDev ? 'http://localhost:3001/api' : '/api';

/**
 * 创建带认证的 axios 实例
 * @param {string} tokenKey localStorage 中存储 token 的键名
 * @returns {import('axios').AxiosInstance} axios 实例
 */
export const createAuthAxios = (tokenKey = 'user') => {
  const instance = axios.create({ baseURL: API_BASE });
  
  instance.interceptors.request.use((config) => {
    try {
      // 如果请求中已经指定了 token，使用指定的 token
      if (config._userToken) {
        config.headers.Authorization = `Bearer ${config._userToken}`;
        return config;
      }
      
      if (tokenKey === 'user' || tokenKey === USERS_STORAGE_KEY) {
        // 多用户模式：使用第一个用户的 token 作为默认
        const users = getUsers();
        if (users.length > 0) {
          config.headers.Authorization = `Bearer ${users[0].token}`;
        }
      } else {
        const stored = localStorage.getItem(tokenKey);
        if (stored) {
          config.headers.Authorization = `Bearer ${stored}`;
        }
      }
    } catch (e) {
      console.error('Token parsing error:', e);
    }
    return config;
  });
  
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401 || error.response?.status === 403) {
        const errorMsg = error.response?.data?.error || '';
        if (errorMsg.includes('token') || errorMsg.includes('Token') || errorMsg.includes('凭证')) {
          if (tokenKey === 'user' || tokenKey === USERS_STORAGE_KEY) {
            // 多用户模式下，token 过期只移除对应用户
            // 如果所有用户都失效，则跳转登录页
            if (getUsers().length === 0) {
              window.location.href = '/srp';
            }
          } else {
            localStorage.removeItem(tokenKey);
            window.location.href = '/admin';
          }
        }
      }
      return Promise.reject(error);
    }
  );
  
  return instance;
};

/**
 * 创建带指定用户 token 的请求配置
 * @param {string} token 用户 token
 * @returns {Object} axios 配置对象
 */
export const withUserToken = (token) => ({ _userToken: token });

// 预创建的 axios 实例
export const userApi = createAuthAxios(USERS_STORAGE_KEY);
export const adminApi = createAuthAxios('adminToken');
