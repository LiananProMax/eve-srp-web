import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useConfig } from '../../contexts/ConfigContext';
import { getCorporationLogoUrl } from '../../utils/imageUtils';
import { useLanguage } from '../../i18n/LanguageContext';

export default function Navbar() {
  const { language, setLanguage, t } = useLanguage();
  const { config } = useConfig();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const corpLogoUrl = getCorporationLogoUrl(config.corpId, 64);

  // 监听滚动，添加背景效果
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  };

  const navLinks = [
    { href: '#corp-info', label: t.corpInfo.title },
    { href: '#killboard', label: t.stats.title },
    { href: `https://zkillboard.com/corporation/${config.corpId}/`, label: 'zKillboard', external: true },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-space/95 backdrop-blur-md shadow-lg shadow-black/20 border-b border-eve/20' 
        : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo 和军团名 */}
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src={corpLogoUrl} 
              alt={config.corpName}
              className="w-10 h-10 rounded-full border-2 border-eve/50 group-hover:border-eve transition-colors"
              onError={(e) => {
                e.currentTarget.src = '/logo.png';
              }}
            />
            <div className="hidden sm:block">
              <span className="text-eve font-orbitron font-bold text-lg">{config.corpTicker}</span>
              <span className="text-gray-300 font-medium ml-2 hidden md:inline">{config.corpName}</span>
            </div>
          </Link>

          {/* 桌面端导航链接 */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-gray-300 hover:text-eve transition-colors rounded-lg hover:bg-eve/10"
                >
                  {link.label}
                  <svg className="w-3 h-3 inline-block ml-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 text-gray-300 hover:text-eve transition-colors rounded-lg hover:bg-eve/10"
                >
                  {link.label}
                </a>
              )
            ))}
            
            {/* SRP 入口按钮 */}
            <Link
              to="/srp"
              className="ml-2 px-4 py-2 bg-eve/20 text-eve border border-eve/50 rounded-lg hover:bg-eve hover:text-space transition-all font-medium"
            >
              {t.srp.title}
            </Link>

            {/* 语言切换 */}
            <button
              onClick={toggleLanguage}
              className="ml-2 px-3 py-2 text-gray-400 hover:text-eve transition-colors rounded-lg hover:bg-eve/10 flex items-center gap-2"
              title={t.language.switchTo}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">{language === 'en' ? '中文' : 'EN'}</span>
            </button>
          </div>

          {/* 移动端菜单按钮 */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-300 hover:text-eve transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* 移动端菜单 */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-eve/20">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                link.external ? (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-3 text-gray-300 hover:text-eve hover:bg-eve/10 rounded-lg transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                    <svg className="w-3 h-3 inline-block ml-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    className="px-4 py-3 text-gray-300 hover:text-eve hover:bg-eve/10 rounded-lg transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                )
              ))}
              
              <Link
                to="/srp"
                className="px-4 py-3 text-eve hover:bg-eve/10 rounded-lg transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t.srp.title}
              </Link>

              <button
                onClick={() => {
                  toggleLanguage();
                  setMobileMenuOpen(false);
                }}
                className="px-4 py-3 text-gray-400 hover:text-eve hover:bg-eve/10 rounded-lg transition-colors text-left flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {language === 'en' ? '切换到中文' : 'Switch to English'}
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
