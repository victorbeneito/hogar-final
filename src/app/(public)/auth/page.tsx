'use client';

export const dynamic = "force-dynamic";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useClienteAuth } from '@/context/ClienteAuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function AuthPage() {
  const [esRegistro, setEsRegistro] = useState(false);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    email: '',
    password: '',
    password2: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  // Visibilidad de contraseñas
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarPassword2, setMostrarPassword2] = useState(false);

  const { login } = useClienteAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Limpiar formulario al cambiar entre Login y Registro
  useEffect(() => {
    setFormData({
      nombre: '',
      apellidos: '',
      email: '',
      password: '',
      password2: '',
    });
    setError('');
    setSuccessMessage('');
  }, [esRegistro]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const response = await fetch('/api/auth/google');
      const data = await response.json();

      if (!data.url) {
        throw new Error('No se pudo obtener la URL de Google');
      }

      window.location.href = data.url;
    } catch (err: any) {
      console.error('❌ Error iniciando Google OAuth:', err);
      setError(err.message || 'Error al conectar con Google');
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (esRegistro) {
        if (formData.password !== formData.password2) {
          throw new Error('Las contraseñas no coinciden.');
        }
        if (formData.password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres.');
        }
      }

      let res;
      let data;

      if (esRegistro) {
        // REGISTRO
        res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: formData.nombre,
            apellidos: formData.apellidos,
            email: formData.email,
            password: formData.password
          }),
        });
      } else {
        // LOGIN
        res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          }),
        });
      }

      data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || data.message || 'Ocurrió un error inesperado');
      }

      login(data.cliente, data.token);
      setSuccessMessage('¡Éxito! Redirigiendo...');

      const redirectUrl = searchParams.get('redirect');

      setTimeout(() => {
        if (redirectUrl && redirectUrl.startsWith('/')) {
          router.push(redirectUrl);
        } else {
          router.push('/account');
        }
      }, 500);

    } catch (err: any) {
      console.error('❌ Error en autenticación:', err);
      setError(err.message || 'Error de conexión con el servidor');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-fondo dark:bg-darkBg flex flex-col transition-colors duration-300">
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-6xl grid md:grid-cols-2 gap-10 items-center">
          
          {/* Columna izquierda: Texto de bienvenida */}
          <div className="space-y-4 hidden md:block">
            <h1 className="text-4xl md:text-5xl font-extrabold text-[#333333] dark:text-white leading-tight">
              {esRegistro ? 'Únete a' : 'Inicia sesión en'}<br />El Hogar de tus Sueños
            </h1>
            <p className="text-sm md:text-base text-[#777777] dark:text-gray-300 max-w-md">
              Guarda tus direcciones, consulta tus pedidos y compra más rápido en cada visita.
            </p>
          </div>

          {/* Columna derecha: Formulario */}
          <div className="bg-white dark:bg-darkNavBg rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-[#e4e0d5] dark:border-gray-700 p-8 w-full max-w-md mx-auto transition-colors duration-300">
            <div className="md:hidden mb-6 text-center">
               <h1 className="text-2xl font-bold text-[#333333] dark:text-white">El Hogar de tus Sueños</h1>
            </div>

            <h2 className="text-xl font-semibold text-[#333333] dark:text-white mb-6 text-center tracking-wide uppercase">
              {esRegistro ? 'Crear cuenta' : 'Iniciar sesión'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {esRegistro && (
                <>
                  <input
                    type="text"
                    placeholder="Nombre *"
                    value={formData.nombre}
                    onChange={(e) => handleChange('nombre', e.target.value)}
                    className="w-full p-3 rounded-[8px] border border-primary bg-fondoCasilla dark:bg-gray-800 text-[#205f78] dark:text-white placeholder-[#b3a899] dark:placeholder-gray-500 focus:outline-none focus:border-[#d9b98a] dark:focus:border-primary transition-colors"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Apellidos *"
                    value={formData.apellidos}
                    onChange={(e) => handleChange('apellidos', e.target.value)}
                    className="w-full p-3 rounded-[8px] border border-primary bg-fondoCasilla dark:bg-gray-800 text-[#205f78] dark:text-white placeholder-[#b3a899] dark:placeholder-gray-500 focus:outline-none focus:border-[#d9b98a] dark:focus:border-primary transition-colors"
                    required
                  />
                </>
              )}

              <input
                type="email"
                placeholder="Correo electrónico *"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full p-3 rounded-[8px] border border-primary bg-fondoCasilla dark:bg-gray-800 text-[#205f78] dark:text-white placeholder-[#b3a899] dark:placeholder-gray-500 focus:outline-none focus:border-[#d9b98a] dark:focus:border-primary transition-colors"
                required
              />

              {/* Contraseña */}
              <div className="relative">
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  placeholder="Contraseña *"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className="w-full p-3 pr-11 rounded-[8px] border border-primary bg-fondoCasilla dark:bg-gray-800 text-[#205f78] dark:text-white placeholder-[#b3a899] dark:placeholder-gray-500 focus:outline-none focus:border-[#d9b98a] dark:focus:border-primary transition-colors"
                  required
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

              {/* Repetir contraseña (Solo Registro) */}
              {esRegistro && (
                <div className="relative">
                  <input
                    type={mostrarPassword2 ? 'text' : 'password'}
                    placeholder="Repite la contraseña *"
                    value={formData.password2}
                    onChange={(e) => handleChange('password2', e.target.value)}
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
              )}

              {/* Mensajes de error y éxito */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-2 rounded text-sm text-center">
                  {error}
                </div>
              )}
              {successMessage && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-300 px-4 py-2 rounded text-sm text-center animate-pulse">
                  {successMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || googleLoading || !!successMessage}
                className="w-full mt-2 py-3 rounded-[8px] bg-primary text-[#3d3d3d] dark:text-black font-semibold tracking-wide hover:bg-primaryHover transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
              >
                {loading ? 'Procesando...' : esRegistro ? 'Crear cuenta' : 'Entrar'}
              </button>

              {/* Separador */}
              <div className="relative flex items-center my-4">
                <div className="flex-grow border-t border-gray-300 dark:border-gray-600" />
                <span className="mx-3 text-xs text-gray-500 dark:text-gray-400 font-medium">O</span>
                <div className="flex-grow border-t border-gray-300 dark:border-gray-600" />
              </div>

              {/* Botón Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading || googleLoading || !!successMessage}
                className="w-full py-3 rounded-[8px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-[#3d3d3d] dark:text-white font-semibold tracking-wide hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {googleLoading ? 'Conectando...' : 'Continuar con Google'}
              </button>
            </form>

            <button
              onClick={() => setEsRegistro(!esRegistro)}
              disabled={loading}
              className="w-full mt-6 text-sm text-[#7f7f7f] dark:text-gray-400 hover:text-[#333333] dark:hover:text-white transition-colors text-center underline decoration-dotted underline-offset-4"
            >
              {esRegistro ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate gratis'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}