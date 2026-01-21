import { useEffect, useState } from 'react';
import axios from 'axios';
import { Navbar, Hero, StatsBoard, KillCard, CorpInfo, Footer } from '../components/home';
import { useConfig } from '../contexts/ConfigContext';
import { isValidTypeId } from '../utils/imageUtils';
import { useLanguage } from '../i18n/LanguageContext';

export default function Home() {
  const [kills, setKills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shipInfoCache, setShipInfoCache] = useState(new Map());
  const { t } = useLanguage();
  const { config } = useConfig();

  // 获取舰船信息的函数
  const fetchShipInfo = async (typeId) => {
    // 先验证Type ID
    if (!isValidTypeId(typeId)) {
      return null;
    }
    
    // 检查缓存
    if (shipInfoCache.has(typeId)) {
      return shipInfoCache.get(typeId);
    }
    
    try {
      const res = await axios.get(
        `https://esi.evetech.net/latest/universe/types/${typeId}/`,
        { timeout: 10000 }
      );
      
      const shipInfo = {
        typeId: typeId,
        name: res.data.name,
        groupId: res.data.group_id
      };
      
      // 更新缓存
      setShipInfoCache(prev => new Map(prev).set(typeId, shipInfo));
      return shipInfo;
    } catch (err) {
      console.error(`获取舰船信息失败 (Type ID: ${typeId}):`, err);
      
      const fallbackInfo = {
        typeId: typeId,
        name: `Ship ${typeId}`,
        groupId: 0
      };
      
      setShipInfoCache(prev => new Map(prev).set(typeId, fallbackInfo));
      return fallbackInfo;
    }
  };

  const fetchKills = async () => {
    try {
      setError(null);
      
      // 步骤1: 使用统计 API 获取高价值击杀ID
      const statsRes = await axios.get(
        `https://zkillboard.com/api/stats/corporationID/${config.corpId}/`
      );
      
      const topIskKillIDs = statsRes.data?.topIskKillIDs || [];
      console.log(`📊 获取到 ${topIskKillIDs.length} 个高价值击杀ID`);
      
      // 步骤2: 获取最近的击杀记录
      const recentKillsRes = await axios.get(
        `https://zkillboard.com/api/kills/corporationID/${config.corpId}/`
      );
      
      const recentKills = recentKillsRes.data || [];
      console.log(`📅 获取到 ${recentKills.length} 个最近击杀记录`);
      
      // 步骤3: 合并去重
      const recentKillIds = recentKills
        .filter((k) => k.killmail_id && k.zkb?.totalValue)
        .map((k) => k.killmail_id);
      
      const allKillIds = Array.from(new Set([...topIskKillIDs, ...recentKillIds]));
      const killIdsToProcess = allKillIds.slice(0, 30);
      
      console.log(`🔄 合并后共 ${allKillIds.length} 个唯一击杀，将处理前 ${killIdsToProcess.length} 个`);
      
      if (killIdsToProcess.length > 0) {
        const topKillIds = killIdsToProcess;
        
        // 为每个击杀ID获取详细信息
        const killsPromises = topKillIds.map(async (killId) => {
          try {
            // 从zkillboard获取hash
            const zkbRes = await axios.get(
              `https://zkillboard.com/api/killID/${killId}/`
            );
            
            if (!zkbRes.data || zkbRes.data.length === 0) {
              return null;
            }
            
            const zkbData = zkbRes.data[0];
            const hash = zkbData.zkb?.hash;
            
            if (!hash) {
              return null;
            }
            
            // 使用ESI API获取完整击杀数据
            const esiRes = await axios.get(
              `https://esi.evetech.net/latest/killmails/${killId}/${hash}/`
            );
            
            const killData = esiRes.data;
            
            if (!killData || !killData.victim) {
              return null;
            }
            
            const shipTypeId = killData.victim.ship_type_id;
            
            if (!shipTypeId || shipTypeId < 1) {
              return null;
            }
            
            // 获取舰船名称
            const shipInfo = await fetchShipInfo(shipTypeId);
            
            // 使用军团标识作为击杀者标识
            const pilotName = config.corpTicker;
            
            return {
              killmail_id: killData.killmail_id,
              killmail_time: killData.killmail_time,
              victim: {
                ship_type_id: shipTypeId
              },
              zkb: zkbData.zkb || { totalValue: 0 },
              attackers: killData.attackers,
              pilot_name: pilotName,
              ship_name: shipInfo?.name || `Ship ${shipTypeId}`
            };
          } catch (err) {
            console.error(`获取击杀 ${killId} 详情失败:`, err);
            return null;
          }
        });
        
        const killsResults = await Promise.all(killsPromises);
        
        // 过滤掉失败的请求和无效的Type ID
        const validKills = killsResults.filter((kill) => {
          if (!kill || !kill.victim || !kill.victim.ship_type_id) {
            return false;
          }
          
          const typeId = kill.victim.ship_type_id;
          if (!isValidTypeId(typeId)) {
            return false;
          }
          
          return !!kill.ship_name;
        });
        
        // 按ISK价值降序排序
        const sortedKills = [...validKills].sort((a, b) => {
          return (b.zkb.totalValue || 0) - (a.zkb.totalValue || 0);
        });
        
        // 只显示前24个最高价值的击杀
        const topKills = sortedKills.slice(0, 24);
        
        console.log(`✅ 成功加载 ${validKills.length} 个有效击杀，显示前 ${topKills.length} 个`);
        setKills(topKills);
      } else {
        setKills([]);
      }
    } catch (err) {
      console.error('获取数据失败:', err);
      setError(t.loading.loadError);
      setKills([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKills();
    const interval = setInterval(fetchKills, 5 * 60 * 1000); // 每5分钟刷新
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div className="min-h-screen">
        {/* 顶部导航栏 */}
        <Navbar />
        
        <Hero />
        
        <div className="container mx-auto px-4 max-w-6xl">
          {/* 公司信息板块 */}
          <section id="corp-info" className="my-12 scroll-mt-20">
            <h2 className="text-4xl font-orbitron text-center mb-8 text-eve">{t.corpInfo.title}</h2>
            <CorpInfo />
          </section>
          
          {/* 战绩统计板块 */}
          <section id="killboard" className="scroll-mt-20 pb-20">
            <h2 className="text-4xl font-orbitron text-center my-12 text-eve">{t.stats.title}</h2>
            <p className="text-center text-gray-400 -mt-8 mb-8">{t.stats.subtitle}</p>
            
            <StatsBoard />
            
            {loading ? (
              <p className="text-center py-20 text-xl">{t.loading.fetchingKills}</p>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-red-400 text-xl mb-4">⚠️ {error}</p>
                <button 
                  onClick={fetchKills}
                  className="px-6 py-2 bg-eve text-space font-bold rounded hover:bg-white transition"
                >
                  {t.common.retry}
                </button>
              </div>
            ) : kills.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-xl mb-2">{t.loading.noKillsYet}</p>
                <p className="text-sm opacity-60">{t.loading.noKillsDesc}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {kills.map(kill => (
                  <KillCard key={kill.killmail_id} kill={kill} />
                ))}
              </div>
            )}
          </section>
        </div>
        
        <Footer />
      </div>
    </>
  );
}
