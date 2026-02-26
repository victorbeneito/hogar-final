"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { useClienteAuth } from "@/context/ClienteAuthContext";

export default function CambiarPassword() {
  const { token } = useClienteAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSaving(true);
    try {
      await fetchWithAuth("/api/clientes/password", token, {
  method: "PUT",
  body: JSON.stringify({ oldPassword, newPassword }),
});
      toast.success("Contraseña cambiada correctamente");
      setOldPassword("");
      setNewPassword("");
    } catch (error) {
      toast.error("Error al cambiar la contraseña");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-10 border-t pt-6 max-w-md">
      <h2 className="text-xl font-semibold mb-4">Cambiar contraseña</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Contraseña actual</label>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="border rounded-md w-full p-2"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Nueva contraseña</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="border rounded-md w-full p-2"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          {saving ? "Cambiando..." : "Actualizar contraseña"}
        </button>
      </form>
    </div>
  );
}


// "use client";

// import { useState } from "react";
// import { useClienteAuth } from "@/context/ClienteAuthContext";
// import { fetchWithAuth } from "@/utils/fetchWithAuth";
// import toast from "react-hot-toast";

// export default function CambiarPassword() {
//   const { token } = useClienteAuth();
//   const [oldPassword, setOldPassword] = useState("");
//   const [newPassword, setNewPassword] = useState("");
//   const [confirmPassword, setConfirmPassword] = useState("");
//   const [loading, setLoading] = useState(false);

//   // --- NUEVO: cálculo de fuerza de contraseña ---
//   const getPasswordStrength = (password: string) => {
//     let score = 0;
//     if (password.length >= 8) score += 1;
//     if (/[A-Z]/.test(password)) score += 1;
//     if (/[0-9]/.test(password)) score += 1;
//     if (/[^A-Za-z0-9]/.test(password)) score += 1;

//     const levels = ["Débil", "Media", "Fuerte", "Muy fuerte"];
//     const colors = ["bg-red-500", "bg-yellow-500", "bg-green-500", "bg-blue-600"];
//     return {
//       label: levels[Math.min(score - 1, 3)] || "Muy débil",
//       color: colors[Math.min(score - 1, 3)] || "bg-gray-300",
//       width: `${(score / 4) * 100}%`,
//     };
//   };

//   const strength = getPasswordStrength(newPassword);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();

//     if (newPassword !== confirmPassword) {
//       toast.error("Las contraseñas nuevas no coinciden");
//       return;
//     }

//     if (!token) {
//       toast.error("No se ha iniciado sesión");
//       return;
//     }

//     setLoading(true);
//     try {
//       const res = await fetchWithAuth("/api/clientes/password", token, {
//         method: "PUT",
//         body: JSON.stringify({ oldPassword, newPassword }),
//       });

//       toast.success(res.message || "Contraseña actualizada correctamente");
//       setOldPassword("");
//       setNewPassword("");
//       setConfirmPassword("");
//     } catch (err: any) {
//       toast.error("Error al actualizar la contraseña");
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="mt-10 border-t pt-6">
//       <h2 className="text-lg font-semibold mb-4">Cambiar contraseña</h2>
//       <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
//         <div>
//           <label className="block text-sm font-medium mb-1">Contraseña actual</label>
//           <input
//             type="password"
//             value={oldPassword}
//             onChange={(e) => setOldPassword(e.target.value)}
//             className="w-full border border-gray-300 rounded-md p-2"
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium mb-1">Nueva contraseña</label>
//           <input
//             type="password"
//             value={newPassword}
//             onChange={(e) => setNewPassword(e.target.value)}
//             className="w-full border border-gray-300 rounded-md p-2"
//           />

//           {/* --- Barra visual de seguridad --- */}
//           {newPassword.length > 0 && (
//             <div className="mt-2">
//               <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
//                 <div
//                   className={`h-full ${strength.color} transition-all duration-300`}
//                   style={{ width: strength.width }}
//                 ></div>
//               </div>
//               <p className="text-sm mt-1">Nivel de seguridad: <strong>{strength.label}</strong></p>
//             </div>
//           )}
//         </div>

//         <div>
//           <label className="block text-sm font-medium mb-1">Confirmar nueva contraseña</label>
//           <input
//             type="password"
//             value={confirmPassword}
//             onChange={(e) => setConfirmPassword(e.target.value)}
//             className="w-full border border-gray-300 rounded-md p-2"
//           />
//         </div>

//         <button
//           type="submit"
//           disabled={loading}
//           className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
//         >
//           {loading ? "Actualizando..." : "Guardar nueva contraseña"}
//         </button>
//       </form>
//     </div>
//   );
// }
