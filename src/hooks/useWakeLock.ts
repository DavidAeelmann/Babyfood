import { useCallback, useEffect, useRef, useState } from 'react';

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
}

export function useWakeLock() {
  const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const [isActive, setIsActive] = useState(false);
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);

  const requestLock = useCallback(async () => {
    if (!isSupported) return;
    try {
      const nav = navigator as unknown as {
        wakeLock: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
      };
      sentinelRef.current = await nav.wakeLock.request('screen');
      setIsActive(true);
    } catch {
      setIsActive(false);
    }
  }, [isSupported]);

  const releaseLock = useCallback(async () => {
    if (sentinelRef.current && !sentinelRef.current.released) {
      try {
        await sentinelRef.current.release();
      } catch {
        // Ignore release errors
      }
    }
    sentinelRef.current = null;
    setIsActive(false);
  }, []);

  const toggle = useCallback(async () => {
    if (isActive) {
      await releaseLock();
    } else {
      await requestLock();
    }
  }, [isActive, releaseLock, requestLock]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isActive) {
        requestLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      releaseLock();
    };
  }, [isActive, releaseLock, requestLock]);

  return { isSupported, isActive, toggle };
}
