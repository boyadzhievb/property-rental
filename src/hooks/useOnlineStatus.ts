import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const goOnline = () => {
      setOnline(true);
      setShowReconnected(true);
      timer = setTimeout(() => setShowReconnected(false), 3000);
    };
    const goOffline = () => {
      setOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      clearTimeout(timer);
    };
  }, []);

  return { online, showReconnected };
}
