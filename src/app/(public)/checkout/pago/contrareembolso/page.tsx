"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

export default function ContrareembolsoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Estados de importes
  const [basePedido, setBasePedido] = useState(0); // Pedido + Envío - Descuentos
  const [recargoFijo, setRecargoFijo] = useState(0);
  const [recargoVariable, setRecargoVariable] = useState(0);
  const [totalA_Pagar, setTotalA_Pagar] = useState(0);
  
  const [loading, setLoading] = useState(false);
  const [pedidoId, setPedidoId] = useState("");

  useEffect(() => {
    // 1. Leer parámetros de la URL
    const totalUrl = searchParams.get("total");
    const idUrl = searchParams.get("id");

    if (!totalUrl || !idUrl) {
        toast.error("Faltan datos del pedido");
        router.push("/checkout/pago");
        return;
    }

    setPedidoId(idUrl);

    // 2. Procesar Importes
    // El totalUrl YA VIENE con los recargos aplicados desde la página anterior.
    // Fórmula usada antes: Total = Base + 3 + (Base * 0.03)
    // Para desglosar, hacemos la inversa: Base = (Total - 3) / 1.03
    
    const totalFinal = parseFloat(totalUrl);
    
    // Constantes de recargo (solo visuales ahora, para el desglose)
    const FIJO = 3.00;
    
    // Matemática inversa para sacar la base limpia
    const baseCalculada = (totalFinal - FIJO) / 1.03;
    const variableCalculada = baseCalculada * 0.03;

    setBasePedido(baseCalculada);
    setRecargoFijo(FIJO);
    setRecargoVariable(variableCalculada);
    setTotalA_Pagar(totalFinal);

  }, [searchParams, router]);

  const handleConfirmarPedido = () => {
    setLoading(true);
    
    // Aquí podrías llamar a una API para marcar el pedido como "Confirmado" si fuera necesario
    // Como ya se guardó en el paso anterior, solo redirigimos a la página de gracias.

    setTimeout(() => {
        router.push(`/checkout/confirmacion?pedido=${pedidoId}`);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-fondo dark:bg-darkBg py-12 px-4 flex justify-center items-start font-sans transition-colors duration-300">
      
      <div className="max-w-xl w-full bg-white dark:bg-darkNavBg rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden transform transition-all">
        
        {/* Cabecera */}
        <div className="bg-gray-800 dark:bg-gray-900 text-white p-8 text-center relative overflow-hidden">
            <div className="absolute top-[-50%] left-[-10%] w-32 h-32 bg-white opacity-5 rounded-full"></div>
            <h1 className="text-2xl font-bold uppercase tracking-widest relative z-10">Pago Contrareembolso</h1>
            <p className="text-gray-400 text-sm mt-2 relative z-10">Abona el importe en efectivo al recibir tu paquete</p>
        </div>

        <div className="p-8 md:p-10 space-y-8">
            
            {/* Aviso Importante */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-5 rounded-r-lg shadow-sm">
                <div className="flex gap-4">
                    <div className="flex-shrink-0">
                        <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-yellow-800 dark:text-yellow-400 text-sm uppercase tracking-wide">Recargo por gestión</h3>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 leading-relaxed">
                            La agencia de transporte aplica una comisión por gestionar el dinero en efectivo. 
                            (Fijo de 3,00€ + 3% del total).
                        </p>
                    </div>
                </div>
            </div>

            {/* Desglose de Precios */}
            <div>
                <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-4 border-b dark:border-gray-700 pb-2">Desglose del Importe</h3>
                <div className="space-y-3 text-sm md:text-base text-gray-600 dark:text-gray-300">
                    
                    {/* Agrupamos Subtotal + Envío - Descuento en una sola línea para no complicar */}
                    <div className="flex justify-between">
                        <span>Importe del Pedido (inc. envío y cupón)</span>
                        <span>{basePedido.toFixed(2)} €</span>
                    </div>
                    
                    {/* Recargos destacados */}
                    <div className="flex justify-between text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 px-3 py-1 rounded">
                        <span>Recargo Gestión (Fijo)</span>
                        <span>+ {recargoFijo.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 px-3 py-1 rounded">
                        <span>Comisión Transportista (3%)</span>
                        <span>+ {recargoVariable.toFixed(2)} €</span>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4 flex justify-between items-center">
                        <span className="font-bold text-lg text-gray-800 dark:text-white">A Pagar al Mensajero:</span>
                        <span className="font-extrabold text-3xl text-primary">{totalA_Pagar.toFixed(2)} €</span>
                    </div>
                    <p className="text-xs text-right text-gray-400 mt-1 italic">* Te recomendamos tener el importe exacto.</p>
                </div>
            </div>

            {/* Botones de Acción */}
            <div className="space-y-4 pt-2">
                <button 
                    onClick={handleConfirmarPedido}
                    disabled={loading}
                    className={`w-full bg-gray-900 hover:bg-black dark:bg-primary dark:hover:bg-primaryHover text-white py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform active:scale-[0.98] flex justify-center items-center gap-3 ${loading ? 'opacity-70 cursor-wait' : ''}`}
                >
                    {loading ? (
                        <>
                           <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                           <span>Finalizando...</span>
                        </>
                    ) : (
                        <>
                           <span>Confirmar Pedido Definitivamente</span>
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        </>
                    )}
                </button>
                
                <button 
                    onClick={() => router.back()} 
                    disabled={loading}
                    className="w-full text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white text-sm font-medium transition-colors hover:underline"
                >
                    Volver atrás
                </button>
            </div>

        </div>
      </div>
    </div>
  );
}
