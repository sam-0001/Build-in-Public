
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  apiUrl: string;
  login: (email: string, password?: string) => Promise<User>;
  signupInit: (userData: Partial<User>) => Promise<void>;
  signupVerify: (email: string, otp: string, password?: string, userData?: Partial<User>) => Promise<User>;
  logout: () => void;
  updateUserPurchases: (type: 'course' | 'note', id: string) => Promise<void>;
  markVideoComplete: (courseId: string, videoId: string) => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to determine API URL dynamically
const getDynamicApiUrl = () => {
    // In production (Render), we serve frontend from backend, so use relative path
    if ((import.meta as any).env && (import.meta as any).env.PROD) {
        return '/api';
    }

    let envUrl = 'http://localhost:5000/api';
    
    // Safely attempt to read VITE_API_URL
    try {
        if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_URL) {
            envUrl = (import.meta as any).env.VITE_API_URL;
        }
    } catch (e) {
        console.warn('Could not read VITE_API_URL from import.meta.env', e);
    }

    if (typeof window !== 'undefined') {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (!isLocalhost && envUrl.includes('localhost')) {
            const newUrl = envUrl.replace('localhost', window.location.hostname);
            return newUrl;
        }
    }
    return envUrl;
};

const API_URL = getDynamicApiUrl();

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('bip_token'));
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load User Profile on Mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          // Token invalid or expired
          logout();
        }
      } catch (err) {
        console.error("Profile fetch failed. Ensure Backend is running.", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

  // --- ACTIONS ---

  const login = async (email: string, password?: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');

    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('bip_token', data.token);
    return data.user;
  };

  const signupInit = async (userData: Partial<User>) => {
    const res = await fetch(`${API_URL}/auth/signup-init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
  };

  const signupVerify = async (email: string, otp: string, password?: string, userData?: Partial<User>) => {
    const res = await fetch(`${API_URL}/auth/signup-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, password, ...userData })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Invalid OTP');

    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('bip_token', data.token);
    return data.user;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('bip_token');
  };

  const updateUserPurchases = async (type: 'course' | 'note', id: string) => {
    if (!user || !token) return;
    
    // Refresh user profile from backend to get latest purchases
    try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if(res.ok) {
            const data = await res.json();
            setUser(data.user);
        }
    } catch(e) { console.error(e) }
  };

  const markVideoComplete = (courseId: string, videoId: string) => {
    if (!user || !token) return;
    
    // Optimistic Update in State
    const currentProgress = user.courseProgress[courseId] || [];
    if (currentProgress.includes(videoId)) return;
    
    const updatedUser = {
      ...user,
      courseProgress: {
        ...user.courseProgress,
        [courseId]: [...currentProgress, videoId]
      }
    };
    setUser(updatedUser);

    // Persist to Backend
    fetch(`${API_URL}/courses/progress`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ courseId, videoId })
    }).catch(err => console.error("Failed to sync progress", err));
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!user,
      loading,
      apiUrl: API_URL,
      login,
      signupInit,
      signupVerify,
      logout,
      updateUserPurchases,
      markVideoComplete,
      showAuthModal,
      setShowAuthModal
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
