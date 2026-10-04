import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { AuthUser, LoginResponse } from '../types';
import { apiLogin, getStoredToken, setStoredToken } from '../api/client';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => void;
  updateUserContext: (partial: Partial<AuthUser>) => void;
}

const STORAGE_KEY_AUTH = 'healthpulse_auth_user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_AUTH);
      if (stored) {
        const parsed: AuthUser = JSON.parse(stored);
        if (parsed && parsed.token) {
          setUser(parsed);
          setStoredToken(parsed.token);
        }
      } else {
        const rawToken = getStoredToken();
        if (rawToken) {
          setStoredToken(null);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY_AUTH);
      setStoredToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResponse> => {
      const res = await apiLogin(email, password);
      const authUser: AuthUser = {
        token: res.token,
        role: res.role,
        userId: res.userId,
        name: res.name,
        email: email,
      };

      setUser(authUser);
      setStoredToken(res.token);
      try {
        localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(authUser));
      } catch {
        // ignore
      }

      return res;
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    setStoredToken(null);
    try {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    } catch {
      // ignore
    }
  }, []);

  const updateUserContext = useCallback((partial: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token: user?.token || null,
        isAuthenticated: !!user?.token,
        isLoading,
        login,
        logout,
        updateUserContext,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
