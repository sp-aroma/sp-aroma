import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { getJson, postJson, setAuthToken } from '../lib/api';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean; // true while we validate token / fetch profile
  user: any | null;
  // login accepts either a raw token string OR a normalized session object returned
  // by the backend: { access_token, session, user, raw }
  login: (tokenOrSession?: string | { access_token?: string; session?: any; user?: any }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();

  // fetch profile on mount (cookie-based auth) or after login
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchMe = async () => {
    setIsLoading(true);
    try {
      // Only fetch if token exists
      const token = localStorage.getItem('spAromaToken');
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const data = await getJson('/accounts/me');
      let fetchedUser = data?.profile || data?.user || null;
      // If backend doesn't return is_superuser in /accounts/me, check localStorage set at login
      try {
        const su = localStorage.getItem('spAromaIsSuper');
        if (su && fetchedUser) fetchedUser = { ...fetchedUser, is_superuser: su === 'true' };
      } catch (e) {}
      // Add is_admin as alias for is_superuser for convenience
      if (fetchedUser && fetchedUser.is_superuser) {
        fetchedUser = { ...fetchedUser, is_admin: fetchedUser.is_superuser };
      }
      setUser(fetchedUser);
    } catch (err: any) {
      // Clear token if 401 Unauthorized
      if (err?.status === 401) {
        localStorage.removeItem('spAromaToken');
        localStorage.removeItem('spAromaIsSuper');
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!mounted) return;
      await fetchMe();
    };
    run();
    return () => { mounted = false };
  }, []);

  const login = async (tokenOrSession?: string | { access_token?: string; session?: any; user?: any }) => {
    // Accept either a raw token string or an object with access_token
    try {
      if (typeof tokenOrSession === 'string') {
        setAuthToken(tokenOrSession);
      } else if (tokenOrSession && typeof tokenOrSession === 'object') {
        // accept object containing access_token and possibly user/is_superuser
        if (tokenOrSession.access_token) setAuthToken(tokenOrSession.access_token);
        // persist is_superuser flag if provided
        try {
          if (typeof (tokenOrSession as any).is_superuser !== 'undefined') {
            localStorage.setItem('spAromaIsSuper', String((tokenOrSession as any).is_superuser));
          }
        } catch (e) {}
        // if user object present in response, seed user state immediately
        if ((tokenOrSession as any).user) {
          const u = (tokenOrSession as any).user;
          const su = (typeof (tokenOrSession as any).is_superuser !== 'undefined') ? (tokenOrSession as any).is_superuser : undefined;
          const userWithFlags = su !== undefined ? { ...u, is_superuser: su, is_admin: su } : u;
          setUser(userWithFlags);
          // still refresh to get latest data
        }
      }
    } catch (e) {
      // ignore
    }
    // fetch profile with token (if present) to ensure latest
    await fetchMe();
  };

  const refreshUser = async () => {
    await fetchMe();
  };

  const logout = async () => {
    // best-effort notify backend to end session and clear local user
    try {
      await postJson('/accounts/logout', {});
    } catch (e) {
      // ignore
    }
    setAuthToken(null);
    try { localStorage.removeItem('spAromaIsSuper'); } catch (e) {}
    setUser(null);
    navigate('/auth');
  };

  // consider user authenticated only when we have a loaded `user` object
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
