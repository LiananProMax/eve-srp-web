import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useConfig } from '../../contexts/ConfigContext';
import { getCorporationLogoUrl } from '../../utils/imageUtils';
import { useLanguage } from '../../i18n/LanguageContext';

export default function Hero() {
  const { config } = useConfig();
  const corpLogoUrl = getCorporationLogoUrl(config.corpId, 256);
  const { t, language } = useLanguage();
  const [isDiscordModalOpen, setDiscordModalOpen] = useState(false);
  const logoAlt =
    language === 'zh'
      ? `${config.corpName} ${t.hero.logoAlt}`
      : `${config.corpName} ${t.hero.logoAlt}`;

  const handleJoinClick = () => {
    if (language === 'zh' && config.qqGroupLink) {
      window.open(config.qqGroupLink, '_blank', 'noopener,noreferrer');
      return;
    }
    setDiscordModalOpen(true);
  };

  const closeDiscordModal = () => {
    setDiscordModalOpen(false);
  };
  
  return (
    <div className="relative py-24 text-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-space/80 to-space"></div>
      <div className="relative z-10">
        <img 
          src={corpLogoUrl} 
          alt={logoAlt}
          loading="lazy"
          className="mx-auto w-32 h-32 rounded-full border-4 border-eve shadow-2xl"
          onError={(e) => {
            // 如果API Logo加载失败，回退到本地logo
            e.currentTarget.src = '/logo.png';
          }}
        />
        <h1 className="mt-6 text-6xl font-bold font-orbitron tracking-wider">
          <span className="text-eve">{config.corpTicker}</span> {config.corpName}
        </h1>
        <div className="mt-6 max-w-3xl mx-auto px-4">
          <p className="text-xl md:text-2xl text-gray-300 leading-relaxed whitespace-pre-line font-light italic">
            {t.hero.slogan}
          </p>
        </div>
        
        {/* 操作按钮组 */}
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <button
            type="button"
            onClick={handleJoinClick}
            className="px-10 py-4 bg-eve text-space font-bold text-xl rounded hover:bg-white transition shadow-lg hover:shadow-eve/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-eve focus:ring-offset-space"
          >
            {t.hero.joinUs}
          </button>
          
          {/* SRP 入口按钮 */}
          <Link 
            to="/srp"
            className="px-10 py-4 bg-transparent border-2 border-eve text-eve font-bold text-xl rounded hover:bg-eve hover:text-space transition shadow-lg hover:shadow-eve/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-eve focus:ring-offset-space"
          >
            {t.srp.title}
          </Link>
        </div>
      </div>
      
      {language === 'en' && isDiscordModalOpen && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="discord-contact-title"
          onClick={closeDiscordModal}
        >
          <div
            className="relative max-w-sm w-full bg-space border border-eve/60 rounded-xl shadow-2xl p-6 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeDiscordModal}
              className="absolute top-3 right-3 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-eve focus:ring-offset-space"
              aria-label={t.hero.discordModal.closeButton}
            >
              X
            </button>
            <h2 id="discord-contact-title" className="text-2xl font-bold text-white">
              {t.hero.discordModal.title}
            </h2>
            <p className="mt-2 text-gray-300 text-sm">
              {t.hero.discordModal.copyHint}
            </p>
            <div className="mt-6 flex items-center gap-4">
              <img
                src={config.discordContactAvatar}
                alt={t.hero.discordModal.avatarAlt}
                className="w-20 h-20 rounded-full border-2 border-eve object-cover"
              />
              <div className="space-y-2">
                <div>
                  <span className="block text-xs uppercase tracking-wide text-gray-400">
                    {t.hero.discordModal.nicknameLabel}
                  </span>
                  <span className="text-lg font-semibold text-white">
                    {config.discordContactNickname}
                  </span>
                </div>
                <div>
                  <span className="block text-xs uppercase tracking-wide text-gray-400">
                    {t.hero.discordModal.discordIdLabel}
                  </span>
                  <span className="text-lg font-semibold text-eve">
                    {config.discordContactId}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={closeDiscordModal}
                className="px-4 py-2 rounded bg-eve text-space font-semibold hover:bg-white transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-eve focus:ring-offset-space"
              >
                {t.hero.discordModal.closeButton}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
