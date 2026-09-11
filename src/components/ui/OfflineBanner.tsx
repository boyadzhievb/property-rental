import { WifiOff, Wifi } from 'lucide-react';
import { useLocale } from '../../context/LocaleContext';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export default function OfflineBanner() {
  const { t } = useLocale();
  const { online, showReconnected } = useOnlineStatus();

  if (online && !showReconnected) return null;

  if (!online) {
    return (
      <div className="mx-4 mt-2 flex items-center gap-2 rounded-xl bg-ios-orange/10 dark:bg-ios-orange/20 px-4 py-2.5">
        <WifiOff size={16} className="shrink-0 text-ios-orange" />
        <p className="text-sm text-ios-text">{t.youAreOffline}</p>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-2 flex items-center gap-2 rounded-xl bg-ios-green/10 dark:bg-ios-green/20 px-4 py-2.5 animate-pulse">
      <Wifi size={16} className="shrink-0 text-ios-green" />
      <p className="text-sm text-ios-text">{t.backOnline}</p>
    </div>
  );
}
