import { RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLocale } from '../../context/LocaleContext';

export default function UpdateBanner() {
  const { t } = useLocale();
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const handler = () => setUpdateAvailable(true);
    window.addEventListener('sw-updated', handler);
    return () => window.removeEventListener('sw-updated', handler);
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="mx-4 mt-2 flex items-center gap-2 rounded-xl bg-ios-blue/10 dark:bg-ios-blue/20 px-4 py-2.5">
      <RefreshCw size={16} className="shrink-0 text-ios-blue" />
      <p className="flex-1 text-sm text-ios-text">{t.newVersionAvailable}</p>
      <button
        onClick={() => window.location.reload()}
        className="shrink-0 rounded-lg bg-ios-blue px-3 py-1.5 text-xs font-semibold text-white active:scale-95 transition-transform"
      >
        {t.refresh}
      </button>
    </div>
  );
}
