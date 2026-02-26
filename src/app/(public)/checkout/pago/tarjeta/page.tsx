"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCart } from "@/lib/cartService";

export default function RedsysPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100 font-sans text-gray-500">
        <div className="flex flex-col items-center gap-4">
           <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
           Conectando con pasarela segura...
        </div>
      </div>
    }>
      <RedsysForm />
    </Suspense>
  );
}

function RedsysForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Estados de datos
  const [importe, setImporte] = useState("0.00");
  const [fecha, setFecha] = useState("");
  // Si no viene orderId en la URL, generamos uno aleatorio para que no quede feo
  const orderId = searchParams.get("orderId") || Math.floor(100000 + Math.random() * 900000).toString();

  // Estados de la interfaz
  const [step, setStep] = useState<'form' | 'loading' | 'success'>('form');
  const [cardForm, setCardForm] = useState({ number: "", expiry: "", cvv: "" });

  // 1. Cargar datos iniciales
  useEffect(() => {
    // Fecha actual formateada
    const now = new Date();
    setFecha(now.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }).replace(",", ""));

    // Calcular total real del carrito
    const cart = getCart();
    const subtotal = cart.reduce(
      (acc: number, item: any) => acc + (item.precioFinal ?? item.precio) * item.cantidad,
      0
    );

    // Recuperar coste de envío
    let costeEnvio = 0;
    if (typeof window !== "undefined") {
      const envioData = localStorage.getItem("checkout_envio");
      if (envioData) {
        try {
            const data = JSON.parse(envioData);
            costeEnvio = data.coste || 0;
        } catch (e) {
            console.error("Error leyendo envío", e);
        }
      }
    }

    // Calcular total final (aquí podrías restar cupón si lo guardaste en localStorage)
    const totalFinal = subtotal + costeEnvio;
    setImporte(totalFinal.toFixed(2));
  }, []);

  // 2. Procesar el pago
  const handleFakePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('loading'); // Pasamos a estado "Cargando"

    // Simulamos espera del banco (2.5 segundos para dar tensión dramática)
    setTimeout(() => {
      setStep('success'); 
    }, 2500);
  };

  // 3. Volver a la tienda
  const finalizarCompra = () => {
    // Redirigir a confirmación con el ID del pedido
    router.push(`/checkout/confirmacion?pedido=${orderId}`);
  };

  return (
    // ⚡ OVERLAY: Tapamos toda la app para simular una redirección externa
    // Forzamos bg-white y texto gris para ignorar el Modo Oscuro de la tienda (los bancos suelen ser claros)
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col font-sans text-gray-700 overflow-y-auto">
      
      {/* --- CABECERA AMARILLA (Estilo Redsys Clásico) --- */}
      <div className="w-full bg-[#f6b919] h-16 flex-shrink-0 shadow-md flex items-center px-4 md:px-10 justify-between relative z-50">
        <div className="flex items-center gap-3">
           {/* Logo Redsys Simulado */}
           <div className="bg-white/20 p-2 rounded backdrop-blur-sm">
             <span className="font-bold text-white text-xl tracking-widest drop-shadow-sm">Redsys</span>
           </div>
           <div className="h-8 w-px bg-white/30 hidden md:block"></div>
           <span className="text-white font-medium text-sm hidden md:block shadow-black drop-shadow-md">TPV Virtual</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="text-white/90 text-xs font-medium bg-black/10 px-3 py-1 rounded-full border border-white/20">
                🔒 Conexión Segura SSL
            </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 relative">
        
        {/* --- BARRA LATERAL IZQUIERDA (Decorativa) --- */}
        <div className="hidden md:flex w-64 bg-[#333333] text-gray-300 flex-col py-8 text-xs font-semibold h-full shadow-inner">
           <div className="px-6 py-3 border-l-4 border-[#f6b919] text-white bg-gray-700/50 mb-2 flex justify-between items-center transition-colors">
             <span>Comercio</span> <span>▸</span>
           </div>
           {['Idiomas', 'Ayuda', 'Seguridad', 'Privacidad'].map(item => (
             <div key={item} className="px-6 py-3 hover:bg-gray-700/50 cursor-pointer border-l-4 border-transparent flex justify-between items-center opacity-70 hover:opacity-100 transition-all">
               <span>{item}</span> <span>▸</span>
             </div>
           ))}
           <div className="mt-auto px-6 opacity-30 text-[10px] text-center">
                © SIS (Servicios para la Sociedad de la Información)
           </div>
        </div>

        {/* --- CONTENIDO CENTRAL --- */}
        <div className="flex-1 bg-[#f5f5f5] p-4 md:p-10 flex justify-center items-start overflow-y-auto">
           
           {/* PANTALLA 1: FORMULARIO DE PAGO */}
           {(step === 'form' || step === 'loading') && (
             <div className="bg-white shadow-2xl max-w-5xl w-full flex flex-col md:flex-row rounded-sm overflow-hidden mt-4 border border-gray-300">
                {/* Columna Datos (Izquierda) */}
                <div className="w-full md:w-5/12 border-r border-gray-200 bg-gray-50 p-8">
                   <h3 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-200 pb-3 uppercase tracking-tight">Datos de la operación</h3>
                   
                   <div className="space-y-5 text-sm">
                      <div className="bg-white p-4 border border-gray-200 rounded shadow-sm">
                         <div className="text-xs text-gray-400 font-bold uppercase mb-1">Importe Total</div>
                         <div className="font-bold text-2xl text-black tracking-tight">{importe} EUR</div>
                      </div>

                      <div className="space-y-3 pt-2 text-sm text-gray-600">
                         <div className="flex justify-between border-b border-gray-100 pb-2">
                            <span className="font-bold text-gray-500">Comercio:</span>
                            <span className="text-right font-medium text-gray-800">El Hogar de tus Sueños</span>
                         </div>
                         <div className="flex justify-between border-b border-gray-100 pb-2">
                            <span className="font-bold text-gray-500">Nº Pedido:</span>
                            <span className="font-mono bg-gray-100 px-2 rounded text-gray-700">{orderId}</span>
                         </div>
                         <div className="flex justify-between border-b border-gray-100 pb-2">
                            <span className="font-bold text-gray-500">Fecha:</span>
                            <span className="font-medium">{fecha}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="font-bold text-gray-500">Terminal:</span>
                            <span className="font-medium">001-VIRTUAL-SECURE</span>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Columna Formulario (Derecha) */}
                <div className="w-full md:w-7/12 p-8 bg-white relative">
                   {/* Overlay de Carga */}
                   {step === 'loading' && (
                     <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center text-center backdrop-blur-[2px]">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-gray-200 border-t-[#f6b919] rounded-full animate-spin mb-4"></div>
                            <div className="w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin absolute top-0 left-0 opacity-30" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                        </div>
                        <h3 className="font-bold text-gray-700 text-lg">Validando operación...</h3>
                        <p className="text-sm text-gray-400 mt-2 animate-pulse">Conectando con su entidad bancaria</p>
                        <p className="text-xs text-red-400 mt-8 font-bold">Por favor, no cierre esta ventana ni pulse 'Atrás'.</p>
                     </div>
                   )}

                   <div className="flex justify-between items-center mb-8 border-b pb-4">
                      <h3 className="font-bold text-gray-800 text-lg uppercase tracking-tight">Pago con Tarjeta</h3>
                      <div className="flex gap-2 opacity-100">
                         <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-6 object-contain" alt="Visa" />
                         <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-6 object-contain" alt="Mastercard" />
                      </div>
                   </div>

                   <form onSubmit={handleFakePayment} className="space-y-6">
                      <div className="relative">
                         <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Número de tarjeta</label>
                         <div className="relative">
                             <input type="text" required maxLength={19} placeholder="0000 0000 0000 0000"
                               className="w-full border border-gray-300 rounded p-3 pl-10 focus:border-[#f6b919] focus:ring-1 focus:ring-[#f6b919] outline-none transition font-mono text-lg text-gray-700 shadow-inner"
                               value={cardForm.number} onChange={e => setCardForm({...cardForm, number: e.target.value})}
                             />
                             <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                         </div>
                      </div>

                      <div className="flex gap-5">
                         <div className="w-1/2">
                            <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Caducidad</label>
                            <input type="text" required placeholder="MM / AA" maxLength={5}
                              className="w-full border border-gray-300 rounded p-3 text-center focus:border-[#f6b919] focus:ring-1 focus:ring-[#f6b919] outline-none font-mono text-gray-700 shadow-inner"
                              value={cardForm.expiry} onChange={e => setCardForm({...cardForm, expiry: e.target.value})}
                            />
                         </div>
                         <div className="w-1/2">
                            <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">CVV / CVC</label>
                            <div className="relative">
                                <input type="password" required placeholder="•••" maxLength={3}
                                  className="w-full border border-gray-300 rounded p-3 text-center focus:border-[#f6b919] focus:ring-1 focus:ring-[#f6b919] outline-none font-mono text-gray-700 shadow-inner"
                                  value={cardForm.cvv} onChange={e => setCardForm({...cardForm, cvv: e.target.value})}
                                />
                                <svg className="w-4 h-4 text-gray-400 absolute right-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                            </div>
                         </div>
                      </div>

                      <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100">
                         <button type="button" onClick={() => router.back()} className="w-1/2 bg-gray-50 border border-gray-300 text-gray-600 py-3 rounded hover:bg-gray-100 text-sm font-bold transition-colors">Cancelar</button>
                         <button type="submit" className="w-1/2 bg-[#f6b919] text-white py-3 rounded shadow-md hover:bg-yellow-500 hover:shadow-lg text-sm font-bold uppercase tracking-wide transition-all transform active:scale-[0.98]">Pagar</button>
                      </div>
                   </form>
                </div>
             </div>
           )}

           {/* PANTALLA 2: PAGO CORRECTO (SUCCESS) */}
           {step === 'success' && (
             <div className="bg-white shadow-2xl max-w-xl w-full rounded-lg overflow-hidden mt-10 border-t-8 border-green-500 text-center p-12 animate-fade-in-up">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                   <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
                
                <h2 className="text-3xl font-bold text-gray-800 mb-2">¡Pago Autorizado!</h2>
                <p className="text-gray-500 mb-8 text-lg">Su entidad bancaria ha confirmado la operación.</p>
                
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8 inline-block text-left w-full shadow-inner">
                   <div className="flex justify-between text-sm mb-3 border-b border-gray-200 pb-2">
                       <span className="text-gray-500">Importe cargado:</span> 
                       <span className="font-bold text-xl text-green-700">{importe} €</span>
                   </div>
                   <div className="flex justify-between text-sm mb-2">
                       <span className="text-gray-500">Número de pedido:</span> 
                       <span className="font-bold text-gray-800">{orderId}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                       <span className="text-gray-500">Código Autorización:</span> 
                       <span className="font-mono text-xs bg-gray-200 px-2 py-0.5 rounded border border-gray-300">AUTH-{Math.floor(Math.random()*1000000)}</span>
                   </div>
                </div>

                <div>
                   <button 
                     onClick={finalizarCompra}
                     className="w-full bg-blue-600 text-white px-8 py-4 rounded-lg shadow-lg hover:bg-blue-700 font-bold text-lg transition-all transform hover:scale-[1.02] hover:shadow-xl flex justify-center items-center gap-2"
                   >
                     <span>Continuar a la tienda</span>
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                   </button>
                   <p className="text-xs text-gray-400 mt-6 animate-pulse">Redirigiendo automáticamente en unos segundos...</p>
                </div>
             </div>
           )}

        </div>
      </div>

      {/* FOOTER SIMULADO */}
      <div className="bg-[#f0f0f0] py-4 border-t border-gray-300 text-center text-[11px] text-gray-500 flex justify-center gap-6 select-none">
          <span className="flex items-center gap-1">🔒 Verified by Visa</span> 
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1">🛡️ Mastercard Identity Check</span> 
          <span className="text-gray-300">|</span>
          <span>RedSys Procesamiento de Pagos Seguros © 2026</span>
      </div>
    </div>
  );
}