"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Definimos la interfaz alineada con MariaDB/Prisma
interface Cliente {
  id: number;       // 👈 Cambio clave: number
  nombre: string;
  apellidos?: string;
  email: string;
  telefono?: string;
  direccion?: string;
  direccionComplementaria?: string;
  codigoPostal?: string;
  ciudad?: string;
  pais?: string;
  provincia?: string;
  empresa?: string;
  nif?: string;
  role?: string;
  [key: string]: any; // Permite propiedades extra temporalmente
}

interface ClienteAuthContextType {
  cliente: Cliente | null;
  token: string | null;
  loading: boolean;
  login: (cliente: Cliente, token: string) => void;
  logout: () => void;
  setCliente: React.Dispatch<React.SetStateAction<Cliente | null>>;
}

const ClienteAuthContext = createContext<ClienteAuthContextType | undefined>(undefined);

export function ClienteAuthProvider({ children }: { children: ReactNode }) {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Cargar cliente y token del almacenamiento local
  useEffect(() => {
    const loadCliente = () => {
      try {
        const storedToken = localStorage.getItem("cliente_token");
        const storedCliente = localStorage.getItem("cliente_datos");

        if (storedToken && storedCliente) {
          // 🧹 LIMPIEZA 1: Si el token guardado tiene comillas, las quitamos
          const cleanToken = storedToken.replace(/['"]+/g, '').trim();
          setToken(cleanToken);

          const parsed = JSON.parse(storedCliente);
          
          // Validación: Asegurar que el ID sea numérico
          if (parsed.id && !isNaN(Number(parsed.id))) {
             setCliente({ ...parsed, id: Number(parsed.id) });
          } else {
             // Si el ID no es válido (ej: basura de Mongo), cerramos sesión
             console.warn("Detectados datos corruptos o antiguos, cerrando sesión...");
             logout();
          }
        } else {
          setCliente(null);
          setToken(null);
        }
      } catch (err) {
        console.error("❌ Error cargando cliente del storage:", err);
        logout(); // Limpiar si hay error
      } finally {
        setLoading(false);
      }
    };

    loadCliente();
  }, []);

  // 🔹 Login
  const login = (clienteData: Cliente, newToken: string) => {
    // Aseguramos que el ID sea número al guardar
    const clienteLimpio = { ...clienteData, id: Number(clienteData.id) };

    // 🧹 LIMPIEZA 2: Limpiamos el token nuevo antes de guardarlo
    const tokenLimpio = newToken.replace(/['"]+/g, '').trim();

    // Guardamos token LIMPIO (sin JSON.stringify)
    localStorage.setItem("cliente_token", tokenLimpio); 
    localStorage.setItem("cliente_datos", JSON.stringify(clienteLimpio));

    setToken(tokenLimpio);
    setCliente(clienteLimpio);
  };

  // 🔹 Logout
  const logout = () => {
    localStorage.removeItem("cliente_token");
    localStorage.removeItem("cliente_datos");
    setToken(null);
    setCliente(null);
  };

  return (
    <ClienteAuthContext.Provider value={{ cliente, token, loading, login, logout, setCliente }}>
      {children}
    </ClienteAuthContext.Provider>
  );
}

export function useClienteAuth() {
  const context = useContext(ClienteAuthContext);
  if (context === undefined) {
    throw new Error("useClienteAuth must be used within ClienteAuthProvider");
  }
  return context;
}