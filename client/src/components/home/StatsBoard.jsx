import { useEffect, useState } from 'react';
import axios from 'axios';
import { useConfig } from '../../contexts/ConfigContext';
import { useLanguage } from '../../i18n/LanguageContext';

export default function StatsBoard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(false);
  const { t } = useLanguage();
  const { config } = useConfig();

  useEffect(() => {
    if (!config.corpId) return;
    axios.get(`https://zkillboard.com/api/stats/corporationID/${config.corpId}/`)
    .then(res => {
      const data = res.data;
      
      // Stats API 返回的是对象，不是数组
      if (data && typeof data === 'object') {
        // 获取本月击杀数（从 months 对象中获取当前月份）
        let monthlyKills = undefined;
        if (data.months && typeof data.months === 'object') {
          const now = new Date();
          const currentMonthKey = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
          const monthData = data.months[currentMonthKey];
          if (monthData && typeof monthData === 'object') {
            monthlyKills = monthData.shipsDestroyed || 0;
          }
        }
        
        setStats({
          allTimeSum: data.iskDestroyed || 0,
          shipsDestroyed: data.shipsDestroyed || 0,
          shipsLost: data.shipsLost || 0,
          efficiency: data.dangerRatio ? `${data.dangerRatio.toFixed(2)}%` : 'N/A',
          soloKills: data.soloKills || 0,
          avgGangSize: data.avgGangSize || 0,
          monthlyKills: monthlyKills,
        });
      } else {
        setError(true);
      }
    })
    .catch(err => {
      console.error('获取统计数据失败:', err);
      setError(true);
    });
  }, [config.corpId]);

  if (error) return <div className="text-center py-10 text-red-400">{t.stats.statsLoadFailed}</div>;
  if (!stats) return <div className="text-center py-10">{t.stats.loadingStats}</div>;

  return (
    <div className="space-y-6 my-12">
      {/* 主要统计数据 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-space/90 p-6 rounded-lg text-center border border-eve">
          <p className="text-eve text-3xl font-bold">{(stats.allTimeSum / 1e12).toFixed(2)} T</p>
          <p className="text-sm opacity-80">{t.stats.totalValue}</p>
        </div>
        <div className="bg-space/90 p-6 rounded-lg text-center border border-eve">
          <p className="text-eve text-3xl font-bold">{stats.shipsDestroyed}</p>
          <p className="text-sm opacity-80">{t.stats.shipsDestroyed}</p>
        </div>
        <div className="bg-space/90 p-6 rounded-lg text-center border border-eve">
          <p className="text-eve text-3xl font-bold">{stats.shipsLost}</p>
          <p className="text-sm opacity-80">{t.stats.shipsLost}</p>
        </div>
        <div className="bg-space/90 p-6 rounded-lg text-center border border-eve">
          <p className="text-eve text-3xl font-bold">{stats.efficiency}</p>
          <p className="text-sm opacity-80">{t.stats.efficiency}</p>
        </div>
      </div>
      
      {/* 额外统计数据 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {stats.soloKills !== undefined && (
          <div className="bg-space/90 p-6 rounded-lg text-center border border-purple-500">
            <p className="text-purple-400 text-3xl font-bold">{stats.soloKills}</p>
            <p className="text-sm opacity-80">{t.stats.soloKills}</p>
          </div>
        )}
        {stats.avgGangSize !== undefined && stats.avgGangSize > 0 && (
          <div className="bg-space/90 p-6 rounded-lg text-center border border-blue-500">
            <p className="text-blue-400 text-3xl font-bold">{stats.avgGangSize.toFixed(1)}</p>
            <p className="text-sm opacity-80">{t.stats.avgGangSize}</p>
          </div>
        )}
        {stats.monthlyKills !== undefined && (
          <div className="bg-space/90 p-6 rounded-lg text-center border border-amber-500">
            <p className="text-amber-400 text-3xl font-bold">{stats.monthlyKills}</p>
            <p className="text-sm opacity-80">{t.stats.monthlyKills}</p>
          </div>
        )}
      </div>
    </div>
  );
}
