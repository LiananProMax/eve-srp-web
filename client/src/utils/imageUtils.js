/**
 * EVE Online Image Server API 工具函数
 * 官方文档: https://developers.eveonline.com/docs/services/image-server/
 */

/**
 * 获取舰船渲染图URL
 * @param {number} typeId 舰船类型ID
 * @param {number} size 图片尺寸(32, 64, 128, 256, 512, 1024)
 * @returns {string} 图片URL
 */
export function getShipRenderUrl(typeId, size = 512) {
  return `https://images.evetech.net/types/${typeId}/render?size=${size}`;
}

/**
 * 获取舰船图标URL
 * @param {number} typeId 舰船类型ID
 * @param {number} size 图片尺寸(32, 64, 128, 256, 512, 1024)
 * @returns {string} 图片URL
 */
export function getShipIconUrl(typeId, size = 128) {
  return `https://images.evetech.net/types/${typeId}/icon?size=${size}`;
}

/**
 * 获取舰船图片URL(带多重回退策略)
 * @param {number} typeId 舰船类型ID
 * @returns {string[]} 图片URL数组,按优先级排序
 */
export function getShipImageUrls(typeId) {
  return [
    // 1. EVE官方渲染图(最高质量)
    `https://images.evetech.net/types/${typeId}/render?size=512`,
    
    // 2. EVE官方图标(总是可用)
    `https://images.evetech.net/types/${typeId}/icon?size=256`,
    
    // 3. 第三方CDN备用
    `https://image.eveonline.com/Type/${typeId}_512.png`,
    
    // 4. 本地占位符
    '/ship-placeholder.svg'
  ];
}

/**
 * 获取舰船图片URL - 使用zkillboard推荐的稳定方式
 * @param {number} typeId 舰船类型ID
 * @param {number} size 图片尺寸
 * @returns {string} 图片URL
 */
export function getShipImageFromZkb(typeId, size = 512) {
  return `https://images.evetech.net/types/${typeId}/render?size=${size}`;
}

/**
 * 获取舰船图标(安全稳定版本 - 总是可用)
 * @param {number} typeId 舰船类型ID
 * @returns {string} 图标URL
 */
export function getShipIconSafe(typeId) {
  return `https://images.evetech.net/types/${typeId}/icon?size=256`;
}

/**
 * 验证Type ID是否在有效范围内
 * @param {number} typeId 舰船类型ID
 * @returns {boolean} 是否有效
 */
export function isValidTypeId(typeId) {
  const MIN_TYPE_ID = 1;
  const MAX_TYPE_ID = 100000;
  
  return Number.isInteger(typeId) && typeId >= MIN_TYPE_ID && typeId <= MAX_TYPE_ID;
}

/**
 * 获取角色头像URL
 * @param {number} characterId 角色ID
 * @param {number} size 图片尺寸(32, 64, 128, 256, 512, 1024)
 * @returns {string} 图片URL
 */
export function getCharacterPortraitUrl(characterId, size = 256) {
  return `https://images.evetech.net/characters/${characterId}/portrait?size=${size}`;
}

/**
 * 获取角色头像URL（别名，与 getCharacterPortraitUrl 相同）
 * @param {number} charId 角色ID
 * @param {number} size 图片尺寸(32, 64, 128, 256, 512, 1024)
 * @returns {string} 图片URL
 */
export function getCharacterAvatarUrl(charId, size = 64) {
  return `https://images.evetech.net/characters/${charId}/portrait?size=${size}`;
}

/**
 * 获取军团Logo URL
 * @param {number} corporationId 军团ID
 * @param {number} size 图片尺寸(32, 64, 128, 256)
 * @returns {string} 图片URL
 */
export function getCorporationLogoUrl(corporationId, size = 128) {
  return `https://images.evetech.net/corporations/${corporationId}/logo?size=${size}`;
}

/**
 * 获取联盟Logo URL
 * @param {number} allianceId 联盟ID
 * @param {number} size 图片尺寸(32, 64, 128)
 * @returns {string} 图片URL
 */
export function getAllianceLogoUrl(allianceId, size = 128) {
  return `https://images.evetech.net/alliances/${allianceId}/logo?size=${size}`;
}
