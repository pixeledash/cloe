import { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/axios';
import endpoints from '../api/endpoints';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is logged in on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const accessToken = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('user');

      if (accessToken && storedUser) {
        try {
          // Verify token is still valid by fetching current user
          const response = await api.get(endpoints.auth.me);
          setUser(response.data);
          setIsAuthenticated(true);
        } catch (error) {
          // Token invalid, clear storage
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password, mfaToken = null) => {
    try {
      const payload = { email, password };
      if (mfaToken) {
        payload.mfa_token = mfaToken;
      }

      const response = await api.post(endpoints.auth.login, payload);

      // Check if MFA is required
      if (response.data.mfa_required) {
        return { mfaRequired: true };
      }

      // Store tokens and user data
      const { tokens, user: userData } = response.data;
      localStorage.setItem('accessToken', tokens.access);
      localStorage.setItem('refreshToken', tokens.refresh);
      localStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      setIsAuthenticated(true);

      return { success: true, user: userData };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      throw new Error(errorMessage);
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post(endpoints.auth.register, userData);
      
      // Auto-login after registration
      const { tokens, user: newUser } = response.data;
      localStorage.setItem('accessToken', tokens.access);
      localStorage.setItem('refreshToken', tokens.refresh);
      localStorage.setItem('user', JSON.stringify(newUser));

      setUser(newUser);
      setIsAuthenticated(true);

      return { success: true, user: newUser };
    } catch (error) {
      const errorMessage = error.response?.data || 'Registration failed';
      throw new Error(JSON.stringify(errorMessage));
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const refreshUser = async () => {
    try {
      const response = await api.get(endpoints.auth.me);
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const hasRole = (roleName) => {
    if (!user || !user.roles) return false;
    return user.roles.includes(roleName);
  };

  const hasAnyRole = (roleNames) => {
    if (!user || !user.roles) return false;
    return roleNames.some(role => user.roles.includes(role));
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
    hasRole,
    hasAnyRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
