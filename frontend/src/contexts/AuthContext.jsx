import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login as loginApi, register as registerApi, refresh as refreshApi, logout as logoutApi, request } from "../api.js";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() => {
    // Initialize from localStorage
    return localStorage.getItem("accessToken");
  });
  const [currentUser, setCurrentUser] = useState(() => {
    // Initialize from localStorage
    const stored = localStorage.getItem("currentUser");
    return stored ? JSON.parse(stored) : null;
  });
  const navigate = useNavigate();

  // Persist to localStorage whenever they change
  useEffect(() => {
    if (accessToken) {
      localStorage.setItem("accessToken", accessToken);
    } else {
      localStorage.removeItem("accessToken");
    }
  }, [accessToken]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("currentUser");
    }
  }, [currentUser]);

  const handleAuthSuccess = useCallback((payload) => {
    setAccessToken(payload.accessToken);
    setCurrentUser(payload.user);
  }, []);

  const updateCurrentUser = useCallback((userData) => {
    setCurrentUser(userData);
  }, []);

  const login = useCallback(
    async (credentials) => {
      const result = await loginApi(credentials);
      handleAuthSuccess(result);
      return result;
    },
    [handleAuthSuccess],
  );

  const register = useCallback(
    async (payload) => {
      const result = await registerApi(payload);
      handleAuthSuccess(result);
      return result;
    },
    [handleAuthSuccess],
  );

  const logout = useCallback(async () => {
    try {
      await logoutApi(accessToken);
    } catch {
      // ignore
    } finally {
      setAccessToken(null);
      setCurrentUser(null);
      navigate("/login", { replace: true });
    }
  }, [navigate, accessToken]);

  const refreshWithRedirect = useCallback(async () => {
    try {
      const result = await refreshApi();
      setAccessToken(result.accessToken);
      return result.accessToken;
    } catch (error) {
      await logout();
      throw error;
    }
  }, [logout]);

  const authFetch = useCallback(
    async (path, options = {}) => {
      const makeRequest = (token) =>
        request(path, {
          ...options,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
          },
        });

      let tokenToUse = accessToken;
      if (!tokenToUse) {
        tokenToUse = await refreshWithRedirect().catch(() => null);
      }
      if (!tokenToUse) {
        await logout();
        throw new Error("Phiên đăng nhập đã hết hạn.");
      }

      try {
        return await makeRequest(tokenToUse);
      } catch (error) {
        if (error.status === 401) {
          const newToken = await refreshWithRedirect().catch(() => null);
          if (!newToken) {
            await logout();
            throw new Error("Phiên đăng nhập đã hết hạn.");
          }
          return makeRequest(newToken);
        }
        throw error;
      }
    },
    [accessToken, logout, refreshWithRedirect],
  );

  const value = useMemo(
    () => ({
      accessToken,
      currentUser,
      login,
      register,
      logout,
      authFetch,
      updateCurrentUser,
    }),
    [accessToken, authFetch, currentUser, login, logout, register, updateCurrentUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
