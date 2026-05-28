'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useClienteAuth } from '@/context/ClienteAuthContext';

function Spinner() {
  return (
    <div className="min-h-screen bg-fondo dark:bg-darkBg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin mb-4">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        </div>
        <p className="text-[#205f78] dark:text-white font-semibold">
          Completando tu inicio de sesión...
        </p>
      </div>
    </div>
  );
}

function GoogleSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useClienteAuth();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;

    const token = searchParams.get('token');
    const clienteBase64 = searchParams.get('cliente');

    if (!token || !clienteBase64) {
      processedRef.current = true;
      router.replace('/auth?error=missing_params');
      return;
    }

    try {
      processedRef.current = true;

      const clienteJson = Buffer.from(clienteBase64, 'base64').toString('utf-8');
      const cliente = JSON.parse(clienteJson);

      login(cliente, token);

      setTimeout(() => {
        router.replace('/account');
      }, 100);
    } catch (error) {
      console.error('Error procesando Google OAuth:', error);
      router.replace('/auth?error=processing_failed');
    }
  }, []);

  return null;
}

export default function GoogleSuccessPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Spinner />
      <GoogleSuccessContent />
    </Suspense>
  );
}
