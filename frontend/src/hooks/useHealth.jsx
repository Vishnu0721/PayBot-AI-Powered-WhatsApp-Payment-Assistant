import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { healthApi } from '../services/api.js';

const HealthContext = createContext({
  health: null,
  loading: true,
  connected: false,
  refresh: () => {},
});

export function HealthProvider({ children }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  async function refresh() {
    try {
      const data = await healthApi();
      setHealth(data);
      setConnected(true);
    } catch {
      setHealth(null);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 20000);
    return () => clearInterval(id);
  }, []);

  const value = useMemo(
    () => ({ health, loading, connected, refresh, demoMode: Boolean(health?.demoMode) }),
    [health, loading, connected],
  );

  return <HealthContext.Provider value={value}>{children}</HealthContext.Provider>;
}

export function useHealth() {
  return useContext(HealthContext);
}
