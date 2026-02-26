'use client';

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
                disabled={loading || !!successMessage}
                className="w-full mt-2 py-3 rounded-[8px] bg-primary text-[#3d3d3d] dark:text-black font-semibold tracking-wide hover:bg-primaryHover transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
              >
                {loading ? 'Procesando...' : esRegistro ? 'Crear cuenta' : 'Entrar'}
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