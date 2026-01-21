import { useState, useEffect } from 'react';
import { getShipImageUrls, isValidTypeId } from '../../utils/imageUtils';
import { useLanguage } from '../../i18n/LanguageContext';

export default function KillCard({ kill }) {
  const [imageIndex, setImageIndex] = useState(0);
  const imageUrls = getShipImageUrls(kill.victim.ship_type_id);
  const { t } = useLanguage();
  
  // 调试：验证Type ID（可选，生产环境可删除）
  useEffect(() => {
    if (!isValidTypeId(kill.victim.ship_type_id)) {
      console.warn(
        `⚠️ 无效的Type ID: ${kill.victim.ship_type_id}`,
        `Kill ID: ${kill.killmail_id}`
      );
    }
  }, [kill]);

  // 计算价值（单位：亿ISK）
  const valueB = (kill.zkb.totalValue / 1e9).toFixed(2);
  const shipImageAltBase = kill.ship_name?.trim() || t.killCard.shipFallbackAlt;
  const shipImageAlt = `${shipImageAltBase} - ${valueB}B ISK`;
  
  // 根据价值决定边框颜色
  const borderColor = Number(valueB) > 10 
    ? 'border-red-500' 
    : Number(valueB) > 5 
      ? 'border-yellow-400' 
      : 'border-eve';
  
  // 飞行员名称
  const pilotLabel = kill.pilot_name || t.killCard.corpMember;

  return (
    <a 
      href={`https://zkillboard.com/kill/${kill.killmail_id}/`} 
      target="_blank" 
      rel="noopener noreferrer"
      className={`block p-4 bg-space/90 rounded-lg border-2 ${borderColor} hover:scale-105 hover:shadow-xl hover:shadow-eve/20 transition-all duration-300 group`}
    >
      <div className="flex flex-col space-y-3">
        {/* 舰船图片 */}
        <div className="relative mx-auto">
          <div className="w-32 h-32 flex items-center justify-center bg-gradient-to-br from-space/50 to-gray-900/50 rounded-lg border border-eve/30 group-hover:border-eve/60 transition-all overflow-hidden">
            <img 
              src={imageUrls[imageIndex]}
              alt={shipImageAlt}
              loading="lazy"
              className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-300"
              onError={() => {
                // 尝试下一个URL
                if (imageIndex < imageUrls.length - 1) {
                  setImageIndex(imageIndex + 1);
                }
              }}
            />
          </div>
          {/* 价值标签 */}
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg animate-pulse">
            💀
          </div>
        </div>
        
        {/* 舰船名称 */}
        {kill.ship_name && (
          <div className="text-center">
            <p className="text-sm font-semibold text-white group-hover:text-eve transition-colors truncate px-2">
              {kill.ship_name}
            </p>
          </div>
        )}
        
        {/* 价值信息 */}
        <div className="text-center space-y-1">
          <p className="text-2xl font-bold text-eve group-hover:text-white transition-colors">
            {valueB}B
          </p>
          <p className="text-xs text-gray-400">{t.killCard.isk}</p>
        </div>
        
        {/* 飞行员名称 */}
        <div className="flex items-center justify-center gap-1">
          <span className="text-xs text-eve group-hover:text-white transition-colors">👤</span>
          <p className="text-xs text-gray-500 text-center group-hover:text-gray-300 transition-colors truncate max-w-[150px]">
            {pilotLabel}
          </p>
        </div>
        
        {/* 悬停提示 */}
        <div className="text-xs text-center text-gray-600 group-hover:text-eve transition-colors pt-2 border-t border-gray-700">
          {t.common.clickForDetails}
        </div>
      </div>
    </a>
  );
}
