import { useConfig } from '../../contexts/ConfigContext';
import { useLanguage } from '../../i18n/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();
  const { config } = useConfig();
  
  // 优先显示联盟名，没有联盟就显示军团名
  const displayName = config.allianceName || config.corpName;
  
  return (
    <footer className="py-8 text-center text-sm opacity-60">
      <p>© {new Date().getFullYear()} {displayName}</p>
      <p>{t.footer.poweredBy}</p>
    </footer>
  );
}
