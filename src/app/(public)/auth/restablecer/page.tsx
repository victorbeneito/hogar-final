'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useClienteAuth } from '@/context/ClienteAuthContext';

function Contenedor({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-fondo dark:bg-darkBg flex flex-col transition-colors duration-300">
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white dark:bg-darkNavBg rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-[#e4e0d5] dark:border-gray-700 p-8 w-full max-w-md transition-colors duration-300">
          {children}
        </div>
      </main>
    </div>
  );
}

function RestablecerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useClienteAuth();
  const token = searchParams.get('token') || '';

  const [comprobando, setComprobando] = useState(true);
  const [tokenValido, setTokenValido] = useState(false);
  const [emailOfuscado, setEmailOfuscado] = useState('');

  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarPassword2, setMostrarPassword2] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [exito, setExito] = useState(false);

  // Validamos el enlace antes de pedir la contraseña: es preferible avisar al
  // llegar que después de escribirla dos veces.
  useEffect(() => {
    if (!token) {
      setError('El enlace está incompleto. Pide uno nuevo desde «He olvidado mi contraseña».');
      setComprobando(false);
      return;
    }

    fetch(`/api/auth/restablecer?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok) {
          setTokenValido(true);
          setEmailOfuscado(data.email || '');
        } else {
          setError(data?.error || 'El enlace no es válido o ha caducado.');
        }
      })
      .catch(() => setError('No hemos podido comprobar el enlace. Inténtalo de nuevo.'))
      .finally(() => setComprobando(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== password2) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/restablecer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'No hemos podido guardar la contraseña.');
      }

      setExito(true);
      login(data.cliente, data.token);

      const redirectUrl = searchParams.get('redirect');
      setTimeout(() => {
        router.replace(redirectUrl && redirectUrl.startsWith('/') ? redirectUrl : '/account');
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor');
      setLoading(false);
    }
  };

  if (comprobando) {
    return (
      <Contenedor>
        <div className="text-center py-6">
          <div className="animate-spin mb-4">
            <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
          <p className="text-[#205f78] dark:text-white font-semibold">Comprobando el enlace...</p>
        </div>
      </Contenedor>
    );
  }

  if (!tokenValido) {
    return (
      <Contenedor>
        <h2 className="text-xl font-semibold text-[#333333] dark:text-white mb-5 text-center tracking-wide uppercase">
          Enlace no válido
        </h2>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded text-sm text-center mb-6">
          {error}
        </div>
        <Link
          href="/auth/recuperar"
          className="block w-full py-3 rounded-[8px] bg-primary text-[#3d3d3d] dark:text-black font-semibold tracking-wide hover:bg-primaryHover transition-colors shadow-md text-center"
        >
          Pedir un enlace nuevo
        </Link>
      </Contenedor>
    );
  }

  return (
    <Contenedor>
      <h2 className="text-xl font-semibold text-[#333333] dark:text-white mb-2 text-center tracking-wide uppercase">
        Nueva contraseña
      </h2>
      {emailOfuscado && (
        <p className="text-sm text-[#777777] dark:text-gray-400 text-center mb-6">
          Para la cuenta <strong>{emailOfuscado}</strong>
        </p>
      )}

      {exito ? (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded text-sm text-center animate-pulse">
          ¡Contraseña actualizada! Entrando en tu cuenta...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={mostrarPassword ? 'text' : 'password'}
              placeholder="Nueva contraseña *"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
              className="w-full p-3 pr-11 rounded-[8px] border border-primary bg-fondoCasilla dark:bg-gray-800 text-[#205f78] dark:text-white placeholder-[#b3a899] dark:placeholder-gray-500 focus:outline-none focus:border-[#d9b98a] dark:focus:border-primary transition-colors"
              required
              autoFocus
            />
            <button
              type="button"
              onClick={() => setMostrarPassword(!mostrarPassword)}
              className="absolute inset-y-0 right-3 flex items-center text-[#b3a899] hover:text-[#8f7f6b] dark:text-gray-400 dark:hover:text-gray-200"
              aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {mostrarPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative">
            <input
              type={mostrarPassword2 ? 'text' : 'password'}
              placeholder="Repite la contraseña *"
              value={password2}
              onChange={(e) => { setPassword2(e.target.value); if (error) setError(''); }}
              className="w-full p-3 pr-11 rounded-[8px] border border-primary bg-fondoCasilla dark:bg-gray-800 text-[#205f78] dark:text-white placeholder-[#b3a899] dark:placeholder-gray-500 focus:outline-none focus:border-[#d9b98a] dark:focus:border-primary transition-colors"
              required
            />
            <button
              type="button"
              onClick={() => setMostrarPassword2(!mostrarPassword2)}
              className="absolute inset-y-0 right-3 flex items-center text-[#b3a899] hover:text-[#8f7f6b] dark:text-gray-400 dark:hover:text-gray-200"
              aria-label={mostrarPassword2 ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {mostrarPassword2 ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-2 rounded text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-[8px] bg-primary text-[#3d3d3d] dark:text-black font-semibold tracking-wide hover:bg-primaryHover transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
          >
            {loading ? 'Guardando...' : 'Guardar y entrar'}
          </button>
        </form>
      )}
    </Contenedor>
  );
}

export default function RestablecerPasswordPage() {
  return (
    <Suspense
      fallback={
        <Contenedor>
          <div className="text-center py-6">
            <div className="animate-spin mb-4">
              <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
            <p className="text-[#205f78] dark:text-white font-semibold">Cargando...</p>
          </div>
        </Contenedor>
      }
    >
      <RestablecerContent />
    </Suspense>
  );
}
