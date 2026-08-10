'use client';

import { PaypalCheckout } from '@/components/PaypalCheckout';
import { useState } from 'react';

export default function TestPaypalPage() {
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  return (
    <div className="max-w-2xl mx-auto p-6 py-16">
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 p-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Prueba de Paypal</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Esta página es para probar la integración de Paypal</p>

        <div className="space-y-4 mb-8">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">📌 Entorno: <span className="font-mono">Sandbox</span></p>
            <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">Usa credenciales de prueba para hacer pagos sin costo real</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Pedido ID:</p>
              <p className="font-mono font-semibold text-gray-900 dark:text-white">TEST-001</p>
            </div>
            <div>
              <p className="text-gray-500">Total:</p>
              <p className="font-mono font-semibold text-gray-900 dark:text-white">29.99 EUR</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h2 className="font-semibold mb-4 text-gray-900 dark:text-white">Botón de pago</h2>
          <PaypalCheckout
            pedidoId="TEST-001"
            currency="EUR"
            onSuccess={(data) => {
              setPaymentStatus('success');
              setPaymentDetails(data);
              console.log('Pago exitoso:', data);
            }}
            onError={(error) => {
              setPaymentStatus('error');
              setPaymentDetails(error);
              console.error('Error en pago:', error);
            }}
          />
        </div>

        {paymentStatus && (
          <div className={`mt-8 p-4 rounded-xl border-2 ${
            paymentStatus === 'success'
              ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
              : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
          }`}>
            <h3 className={`font-semibold mb-2 ${
              paymentStatus === 'success'
                ? 'text-green-900 dark:text-green-200'
                : 'text-red-900 dark:text-red-200'
            }`}>
              {paymentStatus === 'success' ? '✅ Pago exitoso' : '❌ Error en el pago'}
            </h3>
            <pre className="text-xs overflow-auto bg-white dark:bg-gray-950 p-3 rounded border border-gray-300 dark:border-gray-700 max-h-64">
              {JSON.stringify(paymentDetails, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
          <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">💡 Cuentas de prueba Paypal</h3>
          <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">Usa estas credenciales en Paypal Sandbox:</p>
          <div className="space-y-2 text-sm font-mono text-amber-900 dark:text-amber-200 bg-white dark:bg-gray-950 p-3 rounded border border-amber-200 dark:border-amber-800">
            <p><strong>Buyer:</strong> sb-xxxxxxxx@personal.example.com</p>
            <p><strong>Pass:</strong> cualquier contraseña</p>
          </div>
        </div>
      </div>
    </div>
  );
}
