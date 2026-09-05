import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSellerApi } from '../services/api.js';
import { clearSession, getToken, setToken } from '../lib/storage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken());
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  async function loadSeller(nextToken = token) {
    if (!nextToken) {
      setSeller(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getSellerApi();
      setSeller(data.seller);
    } catch (error) {
      if (error.status === 401) {
        clearSession();
        setTokenState('');
        setSeller(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSeller();
  }, []);

  function login(nextToken, nextSeller) {
    setToken(nextToken);
    setTokenState(nextToken);
    setSeller(nextSeller);
  }

  function logout() {
    clearSession();
    setTokenState('');
    setSeller(null);
  }

  const value = useMemo(
    () => ({
      token,
      seller,
      loading,
      isAuthenticated: Boolean(token && seller),
      onboarded: Boolean(seller?.businessName && seller?.name),
      login,
      logout,
      refreshSeller: loadSeller,
      setSeller,
    }),
    [token, seller, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
