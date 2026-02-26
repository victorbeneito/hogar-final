"use client";

import { useState, useEffect } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  importe: string;
  orderId: string;
}

export default function PasarelaRedsys({ isOpen, onClose, onSuccess, importe, orderId }: Props) {
  const [step, setStep] = useState<'form' | 'loading' | 'success'>('form');
  const [fecha, setFecha] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [cardForm, setCardForm] = useState({ number: "", expiry: "", cvv: "" });

  useEffect(() => {
    const now = new Date();
    setFecha(now.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }).replace(",", ""));
  }, []);

  useEffect(() => {
    if (isOpen) setStep('form');
  }, [isOpen]);

  const handlePagar = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('loading');
    setTimeout(() => {
      setStep('success');
    }, 2500);
  };

  if (!isOpen) return null;

  return (
    // BACKDROP: Z-Index muy alto para tapar todo
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in font-sans text-gray-700">
      
      {/* --- VENTANA MODAL RESPONSIVE --- */}
      {/* En móvil: w-full h-full (ocupa todo). En Desktop: redondeado y centrado */}
      <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-6xl md:rounded-xl shadow-2xl flex flex-col relative overflow-hidden">
        
        {/* CABECERA AMARILLA (Siempre visible) */}
        <div className="bg-[#f6b919] h-16 w-full flex-shrink-0 flex items-center px-4 md:px-6 justify-between z-20 shadow-md">
             <div className="flex items-center gap-3">
                 <div className="bg-white/20 p-1.5 rounded-md">
                     <span className="font-extrabold text-white text-xl md:text-2xl tracking-wider opacity-95 drop-shadow-sm">Redsys</span>
                 </div>
                 <div className="hidden md:block h-6 w-px bg-white/30"></div>
                 <span className="text-white font-medium text-sm hidden md:block">TPV Virtual Seguro</span>
             </div>
             
             {/* Botón Cerrar */}
             {step !== 'success' && (
                <button 
                  onClick={onClose}
                  className="bg-black/10 hover:bg-black/20 text-white rounded-full p-2 transition"
                  title="Cancelar Pago"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
             )}
        </div>

        {/* CONTENIDO PRINCIPAL (Scrollable) */}
        <div className="flex flex-1 overflow-hidden bg-[#f5f5f5]">
            
            {/* Si estamos en FORMULARIO o CARGANDO */}
            {step !== 'success' ? (
                <div className="flex w-full h-full">
                    
                    {/* BARRA LATERAL (Solo Desktop Grande - Decorativa) */}
                    <div className="hidden lg:flex w-64 bg-[#333] text-gray-300 flex-col py-8 text-sm font-semibold flex-shrink-0 h-full overflow-y-auto">
                         <div className="px-6 py-3 border-l-4 border-[#f6b919] text-white bg-gray-700/50 mb-1 flex justify-between"><span>Comercio</span> ▸</div>
                         {['Idiomas', 'Ayuda', 'Seguridad'].map(item => (
                            <div key={item} className="px-6 py-3 opacity-60 flex justify-between hover:bg-gray-700/30 cursor-pointer"><span>{item}</span> ▸</div>
                         ))}
                    </div>

                    {/* ZONA CENTRAL SCROLLABLE */}
                    <div className="flex-1 w-full overflow-y-auto">
                        <div className="p-4 md:p-8">
                            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start max-w-5xl mx-auto">
                                
                                {/* CAJA DATOS (Resumen) */}
                                {/* En móvil va arriba, en desktop a la izquierda */}
                                <div className="w-full lg:w-80 bg-white border border-gray-200 rounded-lg shadow-sm flex-shrink-0 overflow-hidden">
                                     <div className="h-1 bg-gray-200 w-full"></div>
                                     <div className="p-5">
                                        <h3 className="text-lg font-bold text-gray-700 border-b pb-3 mb-4">Detalles Operación</h3>
                                        
                                        {/* Precio Destacado */}
                                        <div className="bg-gray-50 p-4 border border-gray-200 rounded-md text-center mb-4">
                                            <span className="block font-bold text-xs text-gray-400 uppercase tracking-wide mb-1">Importe Total</span>
                                            <span className="block font-extrabold text-3xl text-black">{importe} €</span>
                                        </div>

                                        <div className="text-sm text-gray-600 space-y-3">
                                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                                <span className="text-gray-400 text-xs font-bold uppercase">Comercio</span>
                                                <span className="font-bold text-gray-900 text-right">El Hogar de tus Sueños</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Nº Pedido:</span> 
                                                <span className="font-mono font-bold bg-gray-100 px-2 rounded text-gray-800">{orderId}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Fecha:</span> 
                                                <span className="font-medium text-gray-800">{fecha}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Terminal:</span> 
                                                <span className="font-medium text-gray-800">001-VIRTUAL</span>
                                            </div>
                                        </div>
                                     </div>
                                </div>

                                {/* CAJA FORMULARIO */}
                                <div className="flex-1 w-full bg-white border border-gray-200 p-6 md:p-8 rounded-lg shadow-lg relative">
                                     
                                     {/* Overlay de Carga */}
                                     {step === 'loading' && (
                                        <div className="absolute inset-0 bg-white/90 z-30 flex flex-col items-center justify-center rounded-lg backdrop-blur-[1px]">
                                            <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-gray-200 border-t-[#f6b919] rounded-full animate-spin mb-4"></div>
                                            <span className="text-lg md:text-xl font-bold text-gray-700">Conectando con el banco...</span>
                                            <span className="text-xs text-red-400 mt-2 font-bold animate-pulse">No cierre esta ventana</span>
                                        </div>
                                     )}

                                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-4 gap-4">
                                        <h3 className="text-xl md:text-2xl font-bold text-gray-800">Pago con Tarjeta</h3>
                                        <div className="flex gap-2 opacity-80">
                                            <div className="h-6 w-10 bg-blue-900 rounded flex items-center justify-center text-white text-[9px] font-bold italic shadow-sm">Visa</div>
                                            <div className="h-6 w-10 bg-red-600 rounded flex items-center justify-center text-white text-[9px] font-bold relative overflow-hidden shadow-sm">
                                                <div className="absolute w-6 h-6 bg-orange-500 rounded-full -left-2 mix-blend-screen opacity-80"></div>MC
                                            </div>
                                        </div>
                                     </div>

                                     <form onSubmit={handlePagar} className="space-y-5">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1 block">Número de Tarjeta</label>
                                            <div className="relative group">
                                                <input type="tel" placeholder="0000 0000 0000 0000" required maxLength={19} 
                                                   className="w-full border-2 border-gray-300 p-3 pl-10 rounded-lg focus:border-[#f6b919] focus:ring-1 focus:ring-[#f6b919] outline-none font-mono text-lg transition-all bg-gray-50 focus:bg-white" 
                                                />
                                                <span className="absolute left-3 top-3.5 text-gray-400 text-lg group-focus-within:text-[#f6b919]">💳</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-4">
                                            <div className="w-1/2">
                                                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1 block">Caducidad</label>
                                                <div className="relative group">
                                                    <input type="tel" placeholder="MM/AA" required maxLength={5} 
                                                        className="w-full border-2 border-gray-300 p-3 pl-10 rounded-lg focus:border-[#f6b919] focus:ring-1 focus:ring-[#f6b919] outline-none text-lg transition-all bg-gray-50 focus:bg-white" 
                                                    />
                                                    <span className="absolute left-3 top-3.5 text-gray-400 text-lg group-focus-within:text-[#f6b919]">📅</span>
                                                </div>
                                            </div>
                                            <div className="w-1/2">
                                                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1 block">CVV</label>
                                                <div className="relative group">
                                                    <input type="tel" placeholder="123" maxLength={3} required 
                                                        className="w-full border-2 border-gray-300 p-3 pl-10 rounded-lg focus:border-[#f6b919] focus:ring-1 focus:ring-[#f6b919] outline-none text-lg transition-all bg-gray-50 focus:bg-white" 
                                                    />
                                                    <span className="absolute left-3 top-3.5 text-gray-400 text-lg group-focus-within:text-[#f6b919]">🔒</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-6 flex gap-3">
                                            <button type="button" onClick={onClose} className="w-1/3 py-3.5 border-2 border-gray-300 rounded-lg hover:bg-gray-100 text-xs md:text-sm font-bold text-gray-600 transition tracking-wide">CANCELAR</button>
                                            <button type="submit" className="w-2/3 py-3.5 bg-[#f6b919] text-white rounded-lg shadow-md hover:bg-yellow-500 text-sm md:text-base font-bold transition transform active:scale-95 tracking-wide uppercase">Pagar Ahora</button>
                                        </div>
                                     </form>

                                     {/* Footer Formulario */}
                                     <div className="mt-6 pt-4 border-t flex flex-wrap items-center justify-center gap-4 opacity-50 grayscale text-[10px]">
                                        <div className="font-bold border px-2 py-1 rounded">Verified by VISA</div>
                                        <div className="font-bold border px-2 py-1 rounded">Mastercard ID Check</div>
                                     </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // --- PANTALLA ÉXITO (Ocupa todo el modal) ---
                <div className="w-full h-full flex flex-col items-center justify-center p-6 md:p-12 text-center bg-white animate-fade-in overflow-y-auto">
                    <div className="w-24 h-24 md:w-28 md:h-28 bg-green-50 rounded-full flex items-center justify-center mb-6 animate-bounce-slow shadow-sm border border-green-100">
                        <svg className="w-12 h-12 md:w-14 md:h-14 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                    </div>
                    
                    <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-3 tracking-tight">¡Pago Autorizado!</h2>
                    <p className="text-lg md:text-xl text-gray-500 mb-8 max-w-lg font-light">Su operación se ha realizado con éxito.</p>
                    
                    <div className="bg-gray-50 px-6 py-4 rounded-lg border border-gray-200 mb-8 flex flex-col gap-1 shadow-inner w-full max-w-sm">
                        <span className="text-xs text-gray-400 uppercase font-bold tracking-widest">Código de Autorización</span>
                        <span className="font-mono font-bold text-xl md:text-2xl text-gray-800 tracking-wider">AUTH-{Math.floor(Math.random()*999999)}</span>
                    </div>

                    <button 
                        onClick={onSuccess} 
                        className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-xl shadow-blue-200 transform hover:-translate-y-1 flex items-center gap-3 w-full md:w-auto justify-center"
                    >
                        <span>Continuar y Finalizar</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                    </button>
                </div>
            )}
        </div>
        
        {/* FOOTER GENERAL DEL MODAL (Solo Desktop visible o sticky en móvil si se desea) */}
        {step !== 'success' && (
            <div className="bg-[#f9f9f9] h-10 w-full flex-shrink-0 border-t border-gray-300 flex items-center justify-center gap-4 md:gap-8 text-[10px] text-gray-400 uppercase tracking-widest font-semibold z-20">
                <span className="hidden md:inline">Redsys Procesamiento</span> 
                <span>© 2026 Redsys Servicios de Procesamiento.</span>
            </div>
        )}
      </div>
    </div>
  );
}

// "use client";

// import { useState, useEffect } from "react";

// interface Props {
//   isOpen: boolean;
//   onClose: () => void;
//   onSuccess: () => void;
//   importe: string;
//   orderId: string;
// }

// export default function PasarelaRedsys({ isOpen, onClose, onSuccess, importe, orderId }: Props) {
//   const [step, setStep] = useState<'form' | 'loading' | 'success'>('form');
//   const [fecha, setFecha] = useState("");
//   // eslint-disable-next-line @typescript-eslint/no-unused-vars
//   const [cardForm, setCardForm] = useState({ number: "", expiry: "", cvv: "" });

//   useEffect(() => {
//     const now = new Date();
//     setFecha(now.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }).replace(",", ""));
//   }, []);

//   useEffect(() => {
//     if (isOpen) setStep('form');
//   }, [isOpen]);

//   const handlePagar = (e: React.FormEvent) => {
//     e.preventDefault();
//     setStep('loading');
//     setTimeout(() => {
//       setStep('success');
//     }, 2500);
//   };

//   if (!isOpen) return null;

//   return (
//     // BACKDROP
//     <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in font-sans">
      
//       {/* --- VENTANA MODAL (Ahora más ancha: max-w-6xl) --- */}
//       <div className="bg-white w-full max-w-6xl h-auto max-h-[95vh] rounded-xl shadow-2xl flex flex-col relative animate-scale-in border border-gray-400 overflow-hidden">
        
//         {/* CABECERA AMARILLA (Fixed top relative to modal) */}
//         <div className="bg-[#f6b919] h-16 w-full flex-shrink-0 flex items-center px-6 justify-between z-20 shadow-md">
//              <div className="flex items-center gap-3">
//                  <div className="bg-white/20 p-1.5 rounded-md">
//                      <span className="font-extrabold text-white text-2xl tracking-wider opacity-95 drop-shadow-sm">Redsys</span>
//                  </div>
//              </div>
//              <div className="text-white/90 text-l font-medium hidden md:flex items-center gap-2">
//                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
//                 Pasarela de Pagos Segura
//              </div>
//              {/* Botón Cerrar */}
//              {step !== 'success' && (
//                 <button 
//                   onClick={onClose}
//                   className="bg-black/10 hover:bg-black/20 text-white rounded-full p-2 transition ml-4"
//                   title="Cancelar"
//                 >
//                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
//                 </button>
//              )}
//         </div>

//         {/* CONTENIDO PRINCIPAL (Scrollable) */}
//         <div className="flex flex-1 overflow-hidden bg-gray-100">
            
//             {/* Si estamos en FORMULARIO o CARGANDO */}
//             {step !== 'success' ? (
//                 <div className="flex w-full h-full">
                    
//                     {/* BARRA LATERAL (Izquierda) */}
//                     <div className="hidden lg:flex w-64 bg-[#333] text-gray-300 flex-col py-8 text-sm font-semibold flex-shrink-0 h-full overflow-y-auto">
//                          <div className="px-6 py-3 border-l-4 border-[#f6b919] text-white bg-gray-700/50 mb-1 flex justify-between"><span>Comercio</span> ▸</div>
//                          <div className="px-6 py-3 opacity-60 flex justify-between hover:bg-gray-700/30 cursor-pointer"><span>Idiomas</span> ▸</div>
//                          <div className="px-6 py-3 opacity-60 flex justify-between hover:bg-gray-700/30 cursor-pointer"><span>Ayuda</span> ▸</div>
//                          <div className="px-6 py-3 opacity-60 flex justify-between hover:bg-gray-700/30 cursor-pointer"><span>Seguridad</span> ▸</div>
//                     </div>

//                     {/* ZONA CENTRAL (Grid para evitar solapamientos) */}
//                     <div className="flex-1 p-6 md:p-8 overflow-y-auto">
//                         <div className="flex flex-col lg:flex-row gap-8 items-start h-full">
                            
//                             {/* CAJA DATOS (Izquierda) - Ancho fijo para que no se aplaste */}
//                             <div className="w-full lg:w-80 bg-white border border-gray-200 p-6 rounded-lg shadow-sm flex-shrink-0 relative">
//                                  <div className="absolute top-0 left-0 w-full h-1 bg-gray-200"></div>
//                                  <h3 className="text-lg font-bold text-gray-700 border-b pb-3 mb-5">Detalles Operación</h3>
                                 
//                                  <div className="space-y-6">
//                                      {/* Caja de Precio ARREGLADA: Flex-col para que no se monte */}
//                                      <div className="bg-gray-50 p-4 border border-gray-200 rounded-md text-center">
//                                          <span className="block font-bold text-sm text-gray-500 uppercase tracking-wide mb-1">Importe Total</span>
//                                          <span className="block font-extrabold text-3xl text-black">{importe} €</span>
//                                      </div>

//                                      <div className="text-sm text-gray-600 space-y-4">
//                                          <div className="pb-3 border-b border-gray-100">
//                                             <span className="block text-gray-400 text-xs uppercase font-bold mb-1">Comercio</span>
//                                             <span className="block text-gray-900 font-bold text-lg leading-tight">El Hogar de tus Sueños</span>
//                                             <span className="text-xs text-gray-400">ESPAÑA (Sabadell)</span>
//                                          </div>
//                                          <div className="flex justify-between items-center">
//                                             <span className="text-gray-500">Nº Pedido:</span> 
//                                             <span className="font-mono font-bold bg-gray-100 px-2 py-1 rounded text-gray-800">{orderId}</span>
//                                          </div>
//                                          <div className="flex justify-between items-center">
//                                             <span className="text-gray-500">Fecha:</span> 
//                                             <span className="font-medium text-gray-800">{fecha}</span>
//                                          </div>
//                                          <div className="flex justify-between items-center">
//                                             <span className="text-gray-500">Terminal:</span> 
//                                             <span className="font-medium text-gray-800">001-VIRTUAL</span>
//                                          </div>
//                                      </div>
//                                  </div>
//                             </div>

//                             {/* CAJA FORMULARIO (Derecha) - Ocupa el resto */}
//                             <div className="flex-1 w-full bg-white border border-gray-200 p-8 rounded-lg shadow-lg relative min-h-[450px] flex flex-col justify-between">
                                 
//                                  {/* Spinner Loader Overlay */}
//                                  {step === 'loading' && (
//                                     <div className="absolute inset-0 bg-white/95 z-30 flex flex-col items-center justify-center rounded-lg">
//                                         <div className="w-16 h-16 border-4 border-gray-200 border-t-[#f6b919] rounded-full animate-spin mb-4"></div>
//                                         <span className="text-xl font-bold text-gray-700">Conectando...</span>
//                                         <span className="text-sm text-gray-400 mt-2">Validando credenciales bancarias</span>
//                                     </div>
//                                  )}

//                                  <div>
//                                      <div className="flex justify-between items-start mb-8 border-b pb-4">
//                                         <h3 className="text-2xl font-bold text-gray-800">Pagar con Tarjeta</h3>
//                                         <div className="flex gap-2">
//                                             <div className="h-8 w-12 bg-blue-900 rounded flex items-center justify-center text-white text-[10px] font-bold italic border shadow-sm">Visa</div>
//                                             <div className="h-8 w-12 bg-red-600 rounded flex items-center justify-center text-white text-[10px] font-bold relative overflow-hidden border shadow-sm">
//                                                 <div className="absolute w-8 h-8 bg-orange-500 rounded-full -left-2 mix-blend-screen opacity-80"></div>MC
//                                             </div>
//                                         </div>
//                                      </div>

//                                      <form onSubmit={handlePagar} className="space-y-6">
//                                          <div>
//                                              <label className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-2 block">Número de Tarjeta</label>
//                                              <div className="relative group">
//                                                  <input type="text" placeholder="0000 0000 0000 0000" required maxLength={19} 
//                                                     className="w-full border-2 border-gray-300 p-4 pl-12 rounded-lg focus:border-[#f6b919] focus:ring-1 focus:ring-[#f6b919] outline-none font-mono text-xl transition-all bg-gray-50 focus:bg-white focus:shadow-md" 
//                                                  />
//                                                  <span className="absolute left-4 top-4 text-gray-400 text-2xl group-focus-within:text-[#f6b919] transition-colors">💳</span>
//                                              </div>
//                                          </div>

//                                          <div className="flex flex-col sm:flex-row gap-6">
//                                              <div className="w-full sm:w-1/2">
//                                                  <label className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-2 block">Caducidad</label>
//                                                  <div className="relative group">
//                                                     <input type="text" placeholder="MM/AA" required maxLength={5} 
//                                                         className="w-full border-2 border-gray-300 p-4 pl-12 rounded-lg focus:border-[#f6b919] focus:ring-1 focus:ring-[#f6b919] outline-none text-xl transition-all bg-gray-50 focus:bg-white focus:shadow-md" 
//                                                     />
//                                                     <span className="absolute left-4 top-4 text-gray-400 text-xl group-focus-within:text-[#f6b919] transition-colors">📅</span>
//                                                  </div>
//                                              </div>
//                                              <div className="w-full sm:w-1/2">
//                                                  <label className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-2 block">CVV</label>
//                                                  <div className="relative group">
//                                                     <input type="text" placeholder="123" maxLength={3} required 
//                                                         className="w-full border-2 border-gray-300 p-4 pl-12 rounded-lg focus:border-[#f6b919] focus:ring-1 focus:ring-[#f6b919] outline-none text-xl transition-all bg-gray-50 focus:bg-white focus:shadow-md" 
//                                                     />
//                                                     <span className="absolute left-4 top-4 text-gray-400 text-xl group-focus-within:text-[#f6b919] transition-colors">🔒</span>
//                                                  </div>
//                                              </div>
//                                          </div>

//                                          <div className="pt-8 flex gap-4">
//                                              <button type="button" onClick={onClose} className="w-1/3 py-4 border-2 border-gray-300 rounded-lg hover:bg-gray-100 text-sm font-bold text-gray-600 transition tracking-wide">CANCELAR</button>
//                                              <button type="submit" className="w-2/3 py-4 bg-[#f6b919] text-white rounded-lg shadow-lg hover:bg-yellow-500 text-base font-bold transition transform active:scale-95 tracking-wide">PAGAR AHORA</button>
//                                          </div>
//                                      </form>
//                                  </div>

//                                  {/* Footer Formulario */}
//                                  <div className="mt-6 pt-4 border-t flex items-center justify-center gap-6 opacity-50 grayscale">
//                                     <div className="text-[10px] font-bold border px-2 py-1 rounded">Verified by VISA</div>
//                                     <div className="text-[10px] font-bold border px-2 py-1 rounded">Mastercard SecureCode</div>
//                                  </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             ) : (
//                 // --- PANTALLA ÉXITO (Ocupa todo el modal) ---
//                 <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center bg-white animate-fade-in">
//                     <div className="w-28 h-28 bg-green-50 rounded-full flex items-center justify-center mb-6 animate-bounce-slow shadow-sm border border-green-100">
//                         <svg className="w-14 h-14 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
//                     </div>
                    
//                     <h2 className="text-4xl font-extrabold text-gray-800 mb-3 tracking-tight">¡Pago Autorizado!</h2>
//                     <p className="text-xl text-gray-500 mb-10 max-w-lg font-light">Su operación se ha realizado con éxito. El pedido ha sido confirmado correctamente.</p>
                    
//                     <div className="bg-gray-50 px-8 py-4 rounded-lg border border-gray-200 mb-10 flex flex-col gap-1 shadow-sm">
//                         <span className="text-xs text-gray-400 uppercase font-bold tracking-widest">Código de Autorización</span>
//                         <span className="font-mono font-bold text-2xl text-gray-800 tracking-wider">AUTH-{Math.floor(Math.random()*999999)}</span>
//                     </div>

//                     <button 
//                         onClick={onSuccess} 
//                         className="bg-blue-600 text-white px-12 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-xl shadow-blue-200 transform hover:-translate-y-1 flex items-center gap-3"
//                     >
//                         <span>Continuar y Finalizar</span>
//                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
//                     </button>
//                 </div>
//             )}
//         </div>
        
//         {/* FOOTER GENERAL DEL MODAL */}
//         {step !== 'success' && (
//             <div className="bg-[#f9f9f9] h-10 w-full flex-shrink-0 border-t border-gray-300 flex items-center justify-center gap-8 text-[11px] text-gray-400 uppercase tracking-widest font-semibold z-20">
//                 <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-900 rounded-full"></span> Visa Secure</span> 
//                 <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-700 rounded-full"></span> ID Check</span> 
//                 <span>Redsys © 2026</span>
//             </div>
//         )}
//       </div>
//     </div>
//   );
// }