"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // no se usa, mantenido para compatibilidad
  importe: string;
  orderId: string;
}

export default function PasarelaRedsys({ isOpen, onClose, importe, orderId }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    action: string;
    body: Record<string, string>;
  } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const called = useRef(false);

  useEffect(() => {
    if (!isOpen || !orderId || called.current) return;
    called.current = true;
    setError(null);
    setFormData(null);

    fetch("/api/redsys/crear-pago", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pedidoId: orderId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok) throw new Error(data.error || "Error al conectar con Redsys");
        setFormData({ action: data.action, body: data.body });
      })
      .catch((err) => {
        setError(err.message || "Error desconocido");
      });
  }, [isOpen, orderId, importe]);

  // Enviar el formulario al TPV en cuanto tengamos los datos
  useEffect(() => {
    if (formData && formRef.current) {
      formRef.current.submit();
    }
  }, [formData]);

  // Resetear el flag cuando se cierra
  useEffect(() => {
    if (!isOpen) {
      called.current = false;
      setFormData(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-white font-sans">
      {/* Cabecera Redsys */}
      <div className="bg-[#f6b919] h-14 w-full flex items-center px-6 shadow-md flex-shrink-0">
        <span className="font-extrabold text-white text-xl tracking-wider">Redsys</span>
        <span className="ml-3 text-white/80 text-sm hidden md:inline">TPV Virtual Seguro</span>
        <div className="ml-auto text-white/90 text-xs font-medium bg-black/10 px-3 py-1 rounded-full border border-white/20">
          Conexión Segura SSL
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {error ? (
          // Estado de error
          <div className="w-full max-w-md text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No se pudo conectar con el banco</h2>
            <p className="text-sm text-gray-500 mb-2">{error}</p>
            <p className="text-xs text-gray-400 mb-8">
              Comprueba la configuración de Redsys en el panel de administración.
            </p>
            <button
              onClick={onClose}
              className="bg-gray-800 text-white px-8 py-3 rounded-lg font-bold hover:bg-gray-700 transition"
            >
              Volver y elegir otro método
            </button>
          </div>
        ) : (
          // Estado de carga / redirección
          <div className="w-full max-w-md text-center">
            <div className="relative w-20 h-20 mx-auto mb-8">
              <div className="w-20 h-20 border-4 border-gray-200 border-t-[#f6b919] rounded-full animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">
              Conectando con su entidad bancaria...
            </h2>
            <p className="text-sm text-gray-400 mb-2">
              Importe: <span className="font-bold text-gray-700">{importe} €</span>
            </p>
            <p className="text-xs text-red-400 font-bold animate-pulse mt-6">
              Por favor, no cierre esta ventana ni pulse &apos;Atrás&apos;
            </p>
          </div>
        )}
      </div>

      {/* Formulario oculto que se envía automáticamente al TPV de Redsys */}
      {formData && (
        <form ref={formRef} method="POST" action={formData.action} style={{ display: "none" }}>
          {Object.entries(formData.body).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
        </form>
      )}

      <div className="bg-gray-50 border-t border-gray-200 py-3 text-center text-xs text-gray-400 flex-shrink-0">
        <span className="hidden md:inline">Redsys Procesamiento &nbsp;|&nbsp;</span>
        &copy; {new Date().getFullYear()} Redsys Servicios de Procesamiento
      </div>
    </div>
  );
}
