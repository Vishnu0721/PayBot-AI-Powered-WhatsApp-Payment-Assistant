import { useEffect, useState } from 'react';
import { API_BASE } from '../services/api.js';
import { getToken } from '../lib/storage.js';

export function useRealtime(enabled) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    const token = getToken();
    if (!token) return undefined;

    let source;
    try {
      source = new EventSource(`${API_BASE}/events?token=${encodeURIComponent(token)}`);
      source.addEventListener('payment.updated', () => setTick((n) => n + 1));
    } catch {
      source = null;
    }

    const poll = setInterval(() => setTick((n) => n + 1), 4000);

    return () => {
      source?.close();
      clearInterval(poll);
    };
  }, [enabled]);

  return tick;
}
