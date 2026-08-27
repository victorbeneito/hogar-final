'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/recuperar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'No hemos podido enviar el correo. Inténtalo de nuevo.');
      }

      setEnviado(true);
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-fondo dark:bg-darkBg flex flex-col transition-colors duration-300">
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-6xl grid md:grid-cols-2 gap-10 items-center">

          {/* Columna izquierda: explicación */}
          <div className="space-y-4 hidden md:block">
            <h1 className="text-4xl md:text-5xl font-extrabold text-[#333333] dark:text-white leading-tight">
              ¿Has olvidado<br />tu contraseña?
            </h1>
            <p className="text-sm md:text-base text-[#777777] dark:text-gray-300 max-w-md">
              Escribe el correo de tu cuenta y te enviamos un enlace para crear una
              contraseña nueva. Si eras cliente de nuestra tienda anterior, este es el
              camino para recuperar el acceso.
            </p>
          </div>

          {/* Columna derecha: formulario */}
          <div className="bg-white dark:bg-darkNavBg rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-[#e4e0d5] dark:border-gray-700 p-8 w-full max-w-md mx-auto transition-colors duration-300">
            <h2 className="text-xl font-semibold text-[#333333] dark:text-white mb-6 text-center tracking-wide uppercase">
              Recuperar contraseña
            </h2>

            {enviado ? (
              <div className="space-y-5 text-center">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded text-sm">
                  Si el correo corresponde a una cuenta, te hemos enviado un enlace para
                  crear una contraseña nueva. Caduca en 60 minutos.
                </div>
                <p className="text-sm text-[#777777] dark:text-gray-400 leading-relaxed">
                  Revisa también la carpeta de spam o correo no deseado. El remitente es
                  <strong> El Hogar de tus Sueños</strong>.
                </p>
                <Link
                  href="/auth"
                  className="inline-block w-full py-3 rounded-[8px] bg-primary text-[#3d3d3d] dark:text-black font-semibold tracking-wide hover:bg-primaryHover transition-colors shadow-md"
                >
                  Volver a iniciar sesión
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-[#777777] dark:text-gray-400 md:hidden">
                  Escribe el correo de tu cuenta y te enviamos un enlace para crear una
                  contraseña nueva.
                </p>

                <input
                  type="email"
                  placeholder="Correo electrónico *"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
                  className="w-full p-3 rounded-[8px] border border-primary bg-fondoCasilla dark:bg-gray-800 text-[#205f78] dark:text-white placeholder-[#b3a899] dark:placeholder-gray-500 focus:outline-none focus:border-[#d9b98a] dark:focus:border-primary transition-colors"
                  required
                  autoFocus
                />

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
                  {loading ? 'Enviando...' : 'Enviarme el enlace'}
                </button>
              </form>
            )}

            <Link
              href="/auth"
              className="block w-full mt-6 text-sm text-[#7f7f7f] dark:text-gray-400 hover:text-[#333333] dark:hover:text-white transition-colors text-center underline decoration-dotted underline-offset-4"
            >
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
