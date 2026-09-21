import { useEffect, useRef } from 'react';

/**
 * Screen Wake Lock: keeps the display awake while `active` is true
 * (i.e. while the timer runs). Releases on pause/stop and re-requests
 * when the page becomes visible again, since the browser silently
 * releases the lock whenever the tab is hidden.
 */
const useWakeLock = (active: boolean) => {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const supported = 'wakeLock' in navigator;
    if (!supported) return;

    const request = async () => {
      if (!activeRef.current || sentinelRef.current) return;
      try {
        const sentinel = await navigator.wakeLock.request('screen');
        // If the browser releases the lock on its own (e.g. tab hidden),
        // clear the ref so a later visibility change can re-request it.
        sentinel.addEventListener('release', () => {
          if (sentinelRef.current === sentinel) sentinelRef.current = null;
        });
        sentinelRef.current = sentinel;
      } catch (err) {
        console.error('Wake Lock request failed:', err);
      }
    };

    const release = () => {
      sentinelRef.current?.release().catch(() => {});
      sentinelRef.current = null;
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        request();
      }
    };

    if (active) {
      request();
      document.addEventListener('visibilitychange', onVisibilityChange);
    } else {
      release();
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      release();
    };
  }, [active]);
};

export default useWakeLock;
