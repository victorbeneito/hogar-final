"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number; // 👈 Antes string, ahora number
  email: string;
  rol?: string; // 👈 Añadido para gestionar permisos
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // Decodificamos el token manualmente
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        // Verificamos que el payload tenga estructura válida
        if (payload.id && payload.email) {
            setUser({ 
                id: Number(payload.id), // Aseguramos que sea número
                email: payload.email, 
                rol: payload.rol 
            });
        } else {
            setUser(null);
        }
      } catch (error) {
        console.error('❌ Token inválido o corrupto');
        localStorage.removeItem('token'); // Limpiamos si está corrupto
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  const login = (token: string) => {
    localStorage.setItem('token', token);
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser({ 
          id: Number(payload.id), 
          email: payload.email,
          rol: payload.rol
      });
    } catch {
      console.error('❌ Error procesando token en login');
      setUser(null);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
