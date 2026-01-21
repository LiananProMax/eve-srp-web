import { useEffect, useState } from 'react';
import axios from 'axios';
import { useConfig } from '../../contexts/ConfigContext';
import { useLanguage } from '../../i18n/LanguageContext';

// 解析EVE游戏内的富文本标签并转换为HTML
function parseEveDescription(rawDescription) {
  if (!rawDescription) return '';
  
  let cleaned = rawDescription;
  
  // 移除Python风格的字符串前缀 (u'...')
  cleaned = cleaned.replace(/^u['"]|['"]$/g, '');
  
  // 解码Unicode转义序列 (\uXXXX)
  try {
    cleaned = cleaned.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
  } catch (e) {
    console.warn('Unicode解码失败:', e);
  }
  
  // 解码常见的HTML实体
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // 处理EVE的<font>标签
  cleaned = cleaned.replace(
    /<font\s+([^>]+)>/gi,
    (match, attrs) => {
      const styles = [];
      
      // 提取size属性
      const sizeMatch = attrs.match(/size="(\d+)"/i);
      if (sizeMatch) {
        const size = parseInt(sizeMatch[1]);
        const fontSize = Math.max(0.8, Math.min(2, size / 15));
        styles.push(`font-size: ${fontSize}em`);
      }
      
      // 提取color属性
      const colorMatch = attrs.match(/color="(#[0-9a-fA-F]{6,10})"/i);
      if (colorMatch) {
        let color = colorMatch[1];
        let cssColor = color;
        
        // EVE颜色格式: #AARRGGBB (Alpha, Red, Green, Blue)
        if (color.length === 9 || color.length === 10) {
          const alpha = color.substring(1, 3);
          const red = color.substring(3, 5);
          const green = color.substring(5, 7);
          const blue = color.substring(7, 9);
          
          const a = parseInt(alpha, 16) / 255;
          const r = parseInt(red, 16);
          const g = parseInt(green, 16);
          const b = parseInt(blue, 16);
          
          cssColor = `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
        }
        styles.push(`color: ${cssColor}`);
      }
      
      return styles.length > 0 ? `<span style="${styles.join('; ')}">` : '<span>';
    }
  );
  
  // 关闭font标签 -> span标签
  cleaned = cleaned.replace(/<\/font>/gi, '</span>');
  
  // 保留<br>标签
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '<br/>');
  
  // 移除空的span标签
  cleaned = cleaned.replace(/<span[^>]*>\s*<\/span>/gi, '');
  
  // 清理多余的换行
  cleaned = cleaned.replace(/(<br\s*\/?>){3,}/gi, '<br/><br/>');
  
  // 移除首尾空白
  cleaned = cleaned.trim();
  
  return cleaned;
}

export default function CorpInfo() {
  const [corpData, setCorpData] = useState(null);
  const [ceoName, setCeoName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { t } = useLanguage();
  const { config } = useConfig();

  useEffect(() => {
    if (!config.corpId) return;
    
    const fetchCorpInfo = async () => {
      try {
        // 获取公司基本信息
        const corpRes = await axios.get(
          `https://esi.evetech.net/latest/corporations/${config.corpId}/`,
          { timeout: 10000 }
        );
        
        const data = corpRes.data;
        setCorpData(data);

        // 获取CEO名称
        if (data.ceo_id) {
          try {
            const ceoRes = await axios.get(
              `https://esi.evetech.net/latest/characters/${data.ceo_id}/`,
              { timeout: 10000 }
            );
            setCeoName(ceoRes.data.name);
          } catch (err) {
            console.error('获取CEO信息失败:', err);
            setCeoName('Unknown');
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('获取公司信息失败:', err);
        setError(true);
        setLoading(false);
      }
    };

    fetchCorpInfo();
  }, [config.corpId]);

  if (loading) {
    return (
      <div className="bg-space/90 rounded-lg p-8 border border-eve/30">
        <div className="text-center text-gray-400">{t.corpInfo.loading}</div>
      </div>
    );
  }

  if (error || !corpData) {
    return (
      <div className="bg-space/90 rounded-lg p-8 border border-red-500/30">
        <div className="text-center text-red-400">{t.corpInfo.loadError}</div>
      </div>
    );
  }

  // 格式化成立日期
  const foundedDate = new Date(corpData.date_founded).toLocaleDateString(
    t.corpInfo.locale || 'zh-CN',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );

  // 解析EVE富文本描述
  const parsedDescription = parseEveDescription(corpData.description);
  
  // 限制描述长度
  const maxDescriptionLength = 1000;
  const displayDescription = parsedDescription.length > maxDescriptionLength
    ? parsedDescription.substring(0, maxDescriptionLength) + '...'
    : parsedDescription;

  return (
    <div className="bg-gradient-to-br from-space/95 to-gray-900/95 rounded-lg p-8 border-2 border-eve/40 hover:border-eve/60 transition-all duration-300 shadow-xl">
      {/* 公司标题 */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <h2 className="text-4xl font-orbitron font-bold text-eve">
            {corpData.name}
          </h2>
          <span className="text-2xl font-mono text-gray-400 bg-space/50 px-3 py-1 rounded border border-eve/30">
            [{corpData.ticker}]
          </span>
        </div>
        <a 
          href={`https://zkillboard.com/corporation/${config.corpId}/`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm text-eve hover:text-white transition-colors inline-flex items-center gap-1"
        >
          🔗 {t.corpInfo.website}
        </a>
      </div>

      {/* 公司描述 - 渲染EVE富文本 */}
      {displayDescription && (
        <div className="mb-6 p-4 bg-space/50 rounded-lg border border-gray-700 max-h-64 overflow-y-auto">
          <div 
            className="text-gray-300 text-sm leading-relaxed eve-description"
            dangerouslySetInnerHTML={{ __html: displayDescription }}
          />
        </div>
      )}

      {/* 统计信息网格 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 成员数量 */}
        <div className="bg-space/70 p-4 rounded-lg border border-eve/20 hover:border-eve/40 transition-all text-center">
          <div className="text-3xl font-bold text-eve mb-1">
            {corpData.member_count}
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-wider">
            {t.corpInfo.members}
          </div>
        </div>

        {/* CEO */}
        <div className="bg-space/70 p-4 rounded-lg border border-eve/20 hover:border-eve/40 transition-all text-center">
          <div className="text-lg font-bold text-eve mb-1 truncate" title={ceoName}>
            {ceoName || '...'}
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-wider">
            {t.corpInfo.ceo}
          </div>
        </div>

        {/* 税率 */}
        <div className="bg-space/70 p-4 rounded-lg border border-eve/20 hover:border-eve/40 transition-all text-center">
          <div className="text-3xl font-bold text-eve mb-1">
            {(corpData.tax_rate * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-wider">
            {t.corpInfo.taxRate}
          </div>
        </div>

        {/* 成立日期 */}
        <div className="bg-space/70 p-4 rounded-lg border border-eve/20 hover:border-eve/40 transition-all text-center">
          <div className="text-sm font-bold text-eve mb-1">
            {foundedDate}
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-wider">
            {t.corpInfo.founded}
          </div>
        </div>
      </div>
    </div>
  );
}
