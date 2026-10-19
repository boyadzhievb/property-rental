import { X } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div role="alert" className="mx-5 mb-4 p-4 bg-ios-red/10 border border-ios-red/30 rounded-2xl flex items-start gap-3">
      <div className="flex-1 text-sm text-ios-red font-medium">{message}</div>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss" className="text-ios-red/60 active:opacity-70 focus-visible:ring-2 focus-visible:ring-ios-blue focus-visible:rounded focus-visible:outline-none">
          <X size={18} />
        </button>
      )}
    </div>
  );
}
