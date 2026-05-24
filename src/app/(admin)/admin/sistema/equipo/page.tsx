"use client";

import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { Plus, Pencil, Trash2, X, Check, Shield, User } from "lucide-react";

interface AdminUser {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  createdAt: string;
}

interface FormData {
  nombre: string;
  email: string;
  password: string;
  rol: string;
  activo: boolean;
}

const ROL_LABELS: Record<string, string> = {
  superadmin: "SuperAdmin",
  admin: "Admin",
  support: "Soporte",
  auditor: "Auditor",
};

const ROL_COLORS: Record<string, string> = {
  superadmin: "bg-purple-100 text-purple-800",
  admin: "bg-blue-100 text-blue-800",
  support: "bg-orange-100 text-orange-800",
  auditor: "bg-gray-100 text-gray-800",
};

const FORM_VACIO: FormData = { nombre: "", email: "", password: "", rol: "admin", activo: true };

function getTokenRole(): string | null {
  try {
    const token = localStorage.getItem("adminToken");
    if (!token) return null;
    const decoded = jwtDecode<{ rol?: string }>(token);
    return decoded.rol?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

function canEditUsers(role: string | null): boolean {
  return role === "superadmin" || role === "admin";
}

function getAuthHeaders(): Record<string, string> {
  try {
    const token = localStorage.getItem("adminToken");
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {}
  return {};
}

export default function EquipoPage() {
  const [usuarios, setUsuarios] = useState<AdminUser[]>([]);
  const [cargando, setCargando] = useState(true);
  const [esSuperAdmin, setEsSuperAdmin] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmandoEliminar, setConfirmandoEliminar] = useState<number | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [puedeEditar, setPuedeEditar] = useState(false);

  useEffect(() => {
    const rol = getTokenRole();
    setRole(rol);
    setEsSuperAdmin(rol === "superadmin");
    setPuedeEditar(canEditUsers(rol));
    cargarUsuarios();
  }, []);

  async function cargarUsuarios() {
    setCargando(true);
    try {
      const res = await fetch("/api/admin/equipo", { headers: getAuthHeaders() });
      if (res.ok) setUsuarios(await res.json());
    } finally {
      setCargando(false);
    }
  }

  function abrirNuevo() {
    setForm(FORM_VACIO);
    setEditandoId(null);
    setError(null);
    setModalAbierto(true);
  }

  function abrirEditar(u: AdminUser) {
    setForm({ nombre: u.nombre, email: u.email, password: "", rol: u.rol, activo: u.activo });
    setEditandoId(u.id);
    setError(null);
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setEditandoId(null);
    setForm(FORM_VACIO);
    setError(null);
  }

  async function guardar() {
    if (!form.nombre.trim() || !form.email.trim()) {
      setError("Nombre y email son obligatorios.");
      return;
    }
    if (!editandoId && !form.password.trim()) {
      setError("La contraseña es obligatoria para nuevos usuarios.");
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      const url = editandoId ? `/api/admin/equipo/${editandoId}` : "/api/admin/equipo";
      const method = editandoId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al guardar.");
        return;
      }

      await cargarUsuarios();
      cerrarModal();
    } catch {
      setError("Error de conexión.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id: number) {
    setEliminando(true);
    try {
      const res = await fetch(`/api/admin/equipo/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Error al eliminar.");
        return;
      }
      setConfirmandoEliminar(null);
      await cargarUsuarios();
    } finally {
      setEliminando(false);
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        Cargando equipo...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Equipo</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión de usuarios administradores ({usuarios.length})
          </p>
        </div>
        {esSuperAdmin && (
          <button
            onClick={abrirNuevo}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" />
            Nuevo usuario
          </button>
        )}
      </div>

      {!puedeEditar && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          {role === "auditor" ? "Modo auditoría: Solo puedes ver usuarios." : "Solo el SuperAdmin y Admin pueden crear, editar o eliminar usuarios."}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Perfil</th>
              <th className="px-4 py-3 text-center">Activo</th>
              {puedeEditar && <th className="px-4 py-3 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                <td className="px-4 py-3 text-gray-400">{u.id}</td>
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                  {u.nombre}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      ROL_COLORS[u.rol] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {u.rol === "superadmin" ? (
                      <Shield className="w-3 h-3" />
                    ) : (
                      <User className="w-3 h-3" />
                    )}
                    {ROL_LABELS[u.rol] ?? u.rol}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {u.activo ? (
                    <Check className="w-4 h-4 text-green-500 mx-auto" />
                  ) : (
                    <X className="w-4 h-4 text-red-400 mx-auto" />
                  )}
                </td>
                {puedeEditar && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => abrirEditar(u)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmandoEliminar(u.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  No hay usuarios registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal crear/editar */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                {editandoId ? "Editar usuario" : "Nuevo usuario"}
              </h2>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre y apellidos"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contraseña {editandoId ? "(dejar vacío para no cambiar)" : "*"}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={editandoId ? "••••••••" : "Mínimo 8 caracteres"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Perfil *
                </label>
                <select
                  value={form.rol}
                  onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="superadmin">SuperAdmin</option>
                  <option value="admin">Admin</option>
                  <option value="support">Soporte</option>
                  <option value="auditor">Auditor</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={form.activo}
                  onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="activo" className="text-sm text-gray-700 dark:text-gray-300">
                  Usuario activo
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={cerrarModal}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Crear usuario"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación eliminar */}
      {confirmandoEliminar !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              ¿Eliminar usuario?
            </h3>
            <p className="text-sm text-gray-500">
              Esta acción no se puede deshacer. El usuario perderá acceso inmediatamente.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmandoEliminar(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => eliminar(confirmandoEliminar)}
                disabled={eliminando}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                {eliminando ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
