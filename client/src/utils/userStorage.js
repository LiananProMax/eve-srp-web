/**
 * 多用户存储管理工具
 * 支持多个 EVE 角色同时登录
 */

export const USERS_STORAGE_KEY = 'srpUsers';
const OLD_USER_KEY = 'user';

/**
 * 迁移旧的单用户数据到新的多用户格式
 */
const migrateOldUserData = () => {
  const oldUser = localStorage.getItem(OLD_USER_KEY);
  if (oldUser) {
    try {
      const userData = JSON.parse(oldUser);
      if (userData?.charId && userData?.token) {
        // 检查是否已迁移
        const existingUsers = localStorage.getItem(USERS_STORAGE_KEY);
        if (!existingUsers) {
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([userData]));
        }
        // 清除旧数据
        localStorage.removeItem(OLD_USER_KEY);
      }
    } catch (e) {
      localStorage.removeItem(OLD_USER_KEY);
    }
  }
};

/**
 * 获取所有已登录用户
 * @returns {Array} 用户列表
 */
export const getUsers = () => {
  migrateOldUserData();
  try {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    if (stored) {
      const users = JSON.parse(stored);
      return Array.isArray(users) ? users : [];
    }
  } catch (e) {
    console.error('Failed to parse users:', e);
  }
  return [];
};

/**
 * 添加用户（如已存在则更新 token）
 * @param {Object} user 用户对象 { charId, charName, token }
 * @returns {Array} 更新后的用户列表
 */
export const addUser = (user) => {
  const users = getUsers();
  const existingIndex = users.findIndex(u => u.charId === user.charId);
  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  return users;
};

/**
 * 移除指定用户
 * @param {number} charId 角色 ID
 * @returns {Array} 更新后的用户列表
 */
export const removeUser = (charId) => {
  const users = getUsers().filter(u => u.charId !== charId);
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  return users;
};

/**
 * 清除所有用户（退出登录）
 */
export const clearAllUsers = () => {
  localStorage.removeItem(USERS_STORAGE_KEY);
};

/**
 * 获取特定用户
 * @param {number} charId 角色 ID
 * @returns {Object|undefined} 用户对象
 */
export const getUserByCharId = (charId) => {
  return getUsers().find(u => u.charId === charId);
};

/**
 * 检查是否有登录用户
 * @returns {boolean}
 */
export const hasLoggedInUsers = () => {
  return getUsers().length > 0;
};
