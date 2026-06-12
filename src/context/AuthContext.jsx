import React, { createContext, useState, useEffect } from 'react';
import { supabase, checkSupabaseConnection } from '../utils/supabaseClient';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [role, setRole] = useState('patient');
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(false);

  // Restore session on mount
  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      // 1. Try Supabase
      if (supabase) {
        const connected = await checkSupabaseConnection();
        if (connected && active) {
          setDbConnected(true);
          const { data: { session } } = await supabase.auth.getSession();
          if (session && active) {
            const { data: profile } = await supabase.from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();
            
            if (profile && active) {
              const uObj = { id: session.user.id, email: session.user.email, name: profile.name, role: profile.role };
              setUser(uObj);
              setRole(profile.role);
              setIsLoggedIn(true);
            }
          }
          setIsAuthLoading(false);
          return;
        }
      }

      // 2. Offline Fallback
      if (active) {
        const localSessionObj = localStorage.getItem('aarogyasetu_active_user');
        if (localSessionObj) {
          const parsed = JSON.parse(localSessionObj);
          setUser(parsed);
          setRole(parsed.role);
          setIsLoggedIn(true);
        }
        setIsAuthLoading(false);
      }
    };

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  const login = async (email, password) => {
    setIsAuthLoading(true);
    if (dbConnected && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setIsAuthLoading(false);
        throw new Error(error.message);
      }
      
      const { data: profile, error: pErr } = await supabase.from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (pErr || !profile) {
        await supabase.auth.signOut();
        setIsAuthLoading(false);
        throw new Error('User profile record not found.');
      }

      const uObj = { id: data.user.id, email: data.user.email, name: profile.name, role: profile.role };
      setUser(uObj);
      setRole(profile.role);
      setIsLoggedIn(true);
      setIsAuthLoading(false);
      return uObj;
    } else {
      // Offline login check
      const usersStr = localStorage.getItem('aarogyasetu_users') || '[]';
      const usersList = JSON.parse(usersStr);
      const matchedUser = usersList.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      
      if (!matchedUser) {
        setIsAuthLoading(false);
        throw new Error('Invalid email or password.');
      }

      const uObj = { id: `local-${Date.now()}`, email: matchedUser.email, name: matchedUser.name, role: matchedUser.role };
      setUser(uObj);
      setRole(matchedUser.role);
      setIsLoggedIn(true);
      localStorage.setItem('aarogyasetu_active_user', JSON.stringify(uObj));
      setIsAuthLoading(false);
      return uObj;
    }
  };

  const signup = async (email, password, name, roleType) => {
    setIsAuthLoading(true);
    if (dbConnected && supabase) {
      // Supabase signup
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: roleType
          }
        }
      });

      if (error) {
        setIsAuthLoading(false);
        throw new Error(error.message);
      }

      if (!data.user) {
        setIsAuthLoading(false);
        throw new Error('Registration failed, please check input.');
      }

      // Check if session exists (email confirmation might be required)
      if (!data.session) {
        setIsAuthLoading(false);
        throw new Error('Registration successful! Please check your email to confirm your account, then log in.');
      }

      // Upsert profile (handles both cases: trigger already created it, or it wasn't created yet)
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        role: roleType,
        name
      }, { onConflict: 'id' });

      const uObj = { id: data.user.id, email: data.user.email, name, role: roleType };
      setUser(uObj);
      setRole(roleType);
      setIsLoggedIn(true);
      setIsAuthLoading(false);
      return uObj;
    } else {
      // Offline local storage signup
      const usersStr = localStorage.getItem('aarogyasetu_users') || '[]';
      const usersList = JSON.parse(usersStr);
      if (usersList.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        setIsAuthLoading(false);
        throw new Error('Email is already registered.');
      }

      const newUser = { email, password, name, role: roleType };
      usersList.push(newUser);
      localStorage.setItem('aarogyasetu_users', JSON.stringify(usersList));

      const uObj = { id: `local-${Date.now()}`, email, name, role: roleType };
      setUser(uObj);
      setRole(roleType);
      setIsLoggedIn(true);
      localStorage.setItem('aarogyasetu_active_user', JSON.stringify(uObj));
      setIsAuthLoading(false);
      return uObj;
    }
  };

  const logout = async () => {
    setIsAuthLoading(true);
    if (dbConnected && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setRole('patient');
    setIsLoggedIn(false);
    localStorage.removeItem('aarogyasetu_active_user');
    setIsAuthLoading(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      role,
      setRole,
      isLoggedIn,
      isAuthLoading,
      dbConnected,
      login,
      signup,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}
