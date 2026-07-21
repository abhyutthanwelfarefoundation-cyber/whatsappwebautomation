import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axiosClient, { setAccessToken, setUnauthorizedHandler } from '../api/axiosClient';
import { connectSocket, disconnectSocket } from '../api/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);

  const handleUnauthorized = useCallback(() => {
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized);
  }, [handleUnauthorized]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axiosClient.post('/auth/refresh');
        setAccessToken(data.data.accessToken);
        setUser(data.data.user);
        connectSocket(data.data.accessToken);
      } catch {
        setAccessToken(null);
        setUser(null);
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  const login = useCallback(async (email, password, rememberMe) => {
    const { data } = await axiosClient.post('/auth/login', { email, password, rememberMe });
    setAccessToken(data.data.accessToken);
    setUser(data.data.user);
    connectSocket(data.data.accessToken);
    setShowWelcome(true);
    return data.data.user;
  }, []);

  const dismissWelcome = useCallback(() => setShowWelcome(false), []);

  const logout = useCallback(async () => {
    try {
      await axiosClient.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
      disconnectSocket();
    }
  }, []);

  const hasPermission = useCallback(
    (permissionCode) => !!user && user.permissions && user.permissions.includes(permissionCode),
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, initializing, login, logout, hasPermission, showWelcome, dismissWelcome }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}