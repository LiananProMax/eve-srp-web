/**
 * 金额格式化工具
 * 用于 ISK（游戏货币）的格式化显示
 */

/**
 * 格式化数字为千分位显示
 * @param {number|string} value 数值
 * @returns {string} 格式化后的字符串
 */
export const formatISK = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  if (isNaN(num)) return '';
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

/**
 * 解析格式化后的数字（去除逗号）
 * @param {string|number} value 格式化后的数值
 * @returns {number} 解析后的数字
 */
export const parseISK = (value) => {
  if (!value) return 0;
  const cleaned = value.toString().replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};
