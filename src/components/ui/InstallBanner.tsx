import { Download, X } from 'lucide-react';
import { useLocale } from '../../context/LocaleContext';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

export default function InstallBanner() {
  const { t } = useLocale();
  const { canInstall, install, dismiss } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <div className="mx-4 mt-2 flex items-center gap-3 rounded-xl bg-ios-blue/10 dark:bg-ios-blue/20 px-4 py-3">
      <Download size={20} className="shrink-0 text-ios-blue" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ios-text">{t.installApp}</p>
        <p className="text-xs text-ios-text-secondary truncate">{t.installDescription}</p>
      </div>
      <button
        onClick={install}
        className="shrink-0 rounded-lg bg-ios-blue px-3 py-1.5 text-xs font-semibold text-white active:scale-95 transition-transform"
      >
        {t.install}
      </button>
      <button
        onClick={dismiss}
        aria-label={t.close}
        className="shrink-0 p-1 text-ios-text-secondary hover:text-ios-text transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}
