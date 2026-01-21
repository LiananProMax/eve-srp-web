import { useConfig } from '../../contexts/ConfigContext';
import { useLanguage } from '../../i18n/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();
  const { config } = useConfig();
  
  return (
    <footer className="py-8 text-center text-sm opacity-60">
      <p>© {new Date().getFullYear()} {config.corpName}</p>
      <p>{t.footer.poweredBy}</p>
    </footer>
  );
}
