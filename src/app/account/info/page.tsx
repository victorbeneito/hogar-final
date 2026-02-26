"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useClienteAuth } from "@/context/ClienteAuthContext";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import toast from "react-hot-toast";
import CambiarPassword from "@/components/CambiarPassword";
import CambiarEmail from "@/components/CambiarEmail";

// --- COMPONENTE INTERNO DEL FORMULARIO ---
function InfoForm() {
  const { cliente, token, setCliente } = useClienteAuth();
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  // Obtenemos el redirect de la URL (para flujos de checkout)
  const rawRedirect = searchParams.get("redirect");
  const redirectTarget = rawRedirect ? decodeURIComponent(rawRedirect) : null;

  // Cargar datos del cliente
  useEffect(() => {
    if (cliente) {
      setFormData({
        nombre: cliente.nombre || "",
        apellidos: cliente.apellidos || "",
        empresa: cliente.empresa || "",
        direccion: cliente.direccion || "",
        direccionComplementaria: cliente.direccionComplementaria || "",
        codigoPostal: cliente.codigoPostal || "",
        ciudad: cliente.ciudad || "",
        provincia: cliente.provincia || "",
        pais: cliente.pais || "España",
        nif: cliente.nif || "",
        telefono: cliente.telefono || "",
      });
    }
  }, [cliente]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
        toast.error("No hay sesión activa");
        return;
    }

    if (!cliente) {
        toast.error("Esperando datos del cliente...");
        return;
    }

    setSaving(true);

    try {
      const res = await fetchWithAuth(`/api/clientes/${cliente.id}`, token, {
        method: "PUT",
        body: JSON.stringify(formData),
      });

      if (res.error) {
        toast.error(res.error);
        setSaving(false);
        return;
      }

      // Actualizamos estado local y localStorage
      setCliente(res.cliente);
      localStorage.setItem("cliente_datos", JSON.stringify(res.cliente));
      toast.success("Datos actualizados correctamente ✅");

      // LOGICA DE REDIRECCIÓN (Checkout)
      if (redirectTarget) {
        setTimeout(() => {
            router.push(redirectTarget);
            router.refresh(); 
        }, 500);
      } 

    } catch (error) {
      console.error(error);
      toast.error("Error al guardar los datos");
    } finally {
      setSaving(false);
    }
  };

  if (!cliente) return (
    <div className="min-h-screen flex items-center justify-center bg-fondo dark:bg-darkBg">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-fondo dark:bg-darkBg transition-colors duration-300">
        
        {/* Cabecera */}
        <div className="bg-white dark:bg-darkNavBg border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
                <Link 
                    href="/account" 
                    className="text-sm font-bold text-gray-400 hover:text-primary mb-4 inline-block transition-colors"
                >
                    &larr; Volver a mi cuenta
                </Link>
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                    <span className="text-3xl">👤</span> Mis Datos Personales
                </h1>
                {redirectTarget && (
                    <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-lg text-sm font-bold border border-blue-100 dark:border-blue-800 animate-pulse">
                        ⚠️ Por favor, completa tus datos para continuar con la compra.
                    </div>
                )}
            </div>
        </div>

        <main className="max-w-5xl mx-auto px-4 py-12 space-y-8">

            {/* FORMULARIO PRINCIPAL */}
            <form onSubmit={handleSubmit} className="bg-white dark:bg-darkNavBg p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 border-b dark:border-gray-700 pb-2">
                    Información Básica
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Campos Personales */}
                    <div>
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">Nombre</label>
                        <input type="text" name="nombre" value={formData.nombre || ""} onChange={handleChange} 
                            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">Apellidos</label>
                        <input type="text" name="apellidos" value={formData.apellidos || ""} onChange={handleChange} 
                            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">DNI / NIF</label>
                        <input type="text" name="nif" value={formData.nif || ""} onChange={handleChange} 
                            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">Teléfono</label>
                        <input type="text" name="telefono" value={formData.telefono || ""} onChange={handleChange} 
                            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" 
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">Empresa (Opcional)</label>
                        <input type="text" name="empresa" value={formData.empresa || ""} onChange={handleChange} 
                            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" 
                        />
                    </div>
                </div>

                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 border-b dark:border-gray-700 pb-2">
                    Dirección Predeterminada
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">Dirección</label>
                        <input type="text" name="direccion" value={formData.direccion || ""} onChange={handleChange} 
                            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" 
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">Info Adicional (Piso, Puerta...)</label>
                        <input type="text" name="direccionComplementaria" value={formData.direccionComplementaria || ""} onChange={handleChange} 
                            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">Código Postal</label>
                        <input type="text" name="codigoPostal" value={formData.codigoPostal || ""} onChange={handleChange} 
                            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">Ciudad</label>
                        <input type="text" name="ciudad" value={formData.ciudad || ""} onChange={handleChange} 
                            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">Provincia</label>
                        <input type="text" name="provincia" value={formData.provincia || ""} onChange={handleChange} 
                            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">País</label>
                        <input type="text" name="pais" value={formData.pais || "España"} onChange={handleChange} 
                            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" 
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-primary text-white px-8 py-3 rounded-lg font-bold hover:bg-primaryHover disabled:opacity-50 transition-all shadow-lg transform active:scale-95"
                    >
                        {saving ? "Guardando..." : (redirectTarget ? "Guardar y Continuar al Pago →" : "Guardar Cambios")}
                    </button>
                </div>
            </form>

            {/* SECCIÓN DE SEGURIDAD (Email y Password) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-darkNavBg p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                     <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">📧 Cambiar Email</h3>
                     <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        Actualiza tu dirección de correo electrónico de acceso.
                     </p>
                     {/* Componente existente envuelto */}
                     <CambiarEmail />
                </div>

                <div className="bg-white dark:bg-darkNavBg p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                     <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">🔒 Cambiar Contraseña</h3>
                     <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        Mejora la seguridad de tu cuenta actualizando tu clave.
                     </p>
                     {/* Componente existente envuelto */}
                     <CambiarPassword />
                </div>
            </div>

        </main>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL (WRAPPER) ---
const InfoPage = () => {
  return (
    <Suspense fallback={
        <div className="min-h-screen bg-fondo dark:bg-darkBg flex items-center justify-center">
             <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
    }>
      <InfoForm />
    </Suspense>
  );
};

export default InfoPage;

// "use client";

// import React, { useState, useEffect, Suspense } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import { useClienteAuth } from "@/context/ClienteAuthContext";
// import { fetchWithAuth } from "@/utils/fetchWithAuth";
// import toast from "react-hot-toast";
// import CambiarPassword from "@/components/CambiarPassword";
// import CambiarEmail from "@/components/CambiarEmail";

// // --- COMPONENTE INTERNO DEL FORMULARIO ---
// function InfoForm() {
//   const { cliente, token, setCliente } = useClienteAuth();
//   // Inicializamos con any para evitar problemas de tipado rápido
//   const [formData, setFormData] = useState<any>({});
//   const [saving, setSaving] = useState(false);
  
//   const router = useRouter();
//   const searchParams = useSearchParams();

//   // Obtenemos el redirect de la URL
//   const rawRedirect = searchParams.get("redirect");
//   const redirectTarget = rawRedirect ? decodeURIComponent(rawRedirect) : null;

//   // Cargar datos del cliente en el formulario
//   useEffect(() => {
//     if (cliente) {
//       setFormData({
//         nombre: cliente.nombre || "",
//         apellidos: cliente.apellidos || "",
//         empresa: cliente.empresa || "",
//         direccion: cliente.direccion || "",
//         direccionComplementaria: cliente.direccionComplementaria || "",
//         codigoPostal: cliente.codigoPostal || "",
//         ciudad: cliente.ciudad || "",
//         provincia: cliente.provincia || "",
//         pais: cliente.pais || "España",
//         nif: cliente.nif || "",
//         telefono: cliente.telefono || "",
//       });
//     }
//   }, [cliente]);

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
    
//     // 1. Verificación de Token
//     if (!token) {
//         toast.error("No hay sesión activa");
//         return;
//     }

//     // 2. Verificación de Cliente (ESTO ARREGLA EL ERROR DE VERCEL) 🛡️
//     if (!cliente) {
//         toast.error("Esperando datos del cliente...");
//         return;
//     }

//     setSaving(true);

//     try {
//       // Ahora TypeScript ya sabe que 'cliente' no es null aquí
//       const res = await fetchWithAuth(`/api/clientes/${cliente.id}`, token, {
//         method: "PUT",
//         body: JSON.stringify(formData),
//       });

//       if (res.error) {
//         toast.error(res.error);
//         setSaving(false);
//         return;
//       }

//       // Actualizamos estado local
//       setCliente(res.cliente);
//       localStorage.setItem("cliente_datos", JSON.stringify(res.cliente));
//       toast.success("Datos guardados correctamente ✅");

//       // LOGICA DE REDIRECCIÓN
//       if (redirectTarget) {
//         console.log("🚀 Redirigiendo a:", redirectTarget);
//         // Pequeño delay para UX
//         setTimeout(() => {
//             router.push(redirectTarget);
//             router.refresh(); 
//         }, 500);
//       } 

//     } catch (error) {
//       console.error(error);
//       toast.error("Error al guardar");
//     } finally {
//       setSaving(false);
//     }
//   };

//   if (!cliente) return <div className="p-4 text-center">Cargando datos...</div>;

//   return (
//     <div className="max-w-3xl mx-auto px-4 py-10">
//       <h1 className="text-2xl font-bold mb-6">
//         Información personal
//         {redirectTarget && <span className="block text-sm font-normal text-blue-600 mt-1">Paso 1 de 2: Confirma tus datos</span>}
//       </h1>

//       <form onSubmit={handleSubmit} className="space-y-4 max-w-md mb-10">
//         {[
//           { name: "nombre", label: "Nombre" },
//           { name: "apellidos", label: "Apellidos" },
//           { name: "empresa", label: "Empresa" },
//           { name: "nif", label: "NIF" },
//           { name: "telefono", label: "Teléfono" },
//           { name: "direccion", label: "Dirección" },
//           { name: "direccionComplementaria", label: "Dirección complementaria" },
//           { name: "codigoPostal", label: "Código Postal" },
//           { name: "ciudad", label: "Ciudad" },
//           { name: "provincia", label: "Provincia" },
//           { name: "pais", label: "País" },
//         ].map(({ name, label }) => (
//           <div key={name}>
//             <label className="block text-sm font-medium mb-1 text-gray-700">{label}</label>
//             <input
//               type="text"
//               name={name}
//               value={formData[name] || ""}
//               onChange={handleChange}
//               className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
//             />
//           </div>
//         ))}

//         <button
//           type="submit"
//           disabled={saving}
//           className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 w-full font-semibold transition-colors"
//         >
//           {saving ? "Guardando..." : (redirectTarget ? "Guardar y Continuar al Pago →" : "Guardar cambios")}
//         </button>
//       </form>

//       <div className="border-t pt-8 space-y-8">
//         <CambiarEmail />
//         <CambiarPassword />
//       </div>
//     </div>
//   );
// }

// // --- COMPONENTE PRINCIPAL (WRAPPER) ---
// const InfoPage = () => {
//   return (
//     <Suspense fallback={<div className="p-10 text-center">Cargando formulario...</div>}>
//       <InfoForm />
//     </Suspense>
//   );
// };

// export default InfoPage;


