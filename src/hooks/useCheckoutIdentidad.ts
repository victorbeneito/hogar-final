"use client";

import { useCallback, useEffect, useState } from "react";
import { useClienteAuth } from "@/context/ClienteAuthContext";
import { getGuestCheckout, type GuestCheckoutData } from "@/lib/guestCheckout";

export interface DireccionEnvio {
  nombre?: string;
  apellidos?: string;
  empresa?: string;
  nif?: string;
  telefono?: string;
  direccion?: string;
  direccionComplementaria?: string;
  codigoPostal?: string;
  ciudad?: string;
  provincia?: string;
  pais?: string;
}

export type ModoCheckout = "cliente" | "invitado";

/**
 * Unifica las dos formas de recorrer el checkout: cliente con cuenta
 * (ClienteAuthContext) o invitado (datos en localStorage). Las páginas de
 * envío / resumen / pago sólo necesitan mirar `modo` y `direccionEnvio`.
 */
export function useCheckoutIdentidad() {
  const { cliente, token, loading: loadingAuth } = useClienteAuth();
  const [invitado, setInvitado] = useState<GuestCheckoutData | null>(null);
  const [invitadoCargado, setInvitadoCargado] = useState(false);
  const [direccionEnvio, setDireccionEnvio] = useState<DireccionEnvio | null>(null);
  const [cargandoDireccion, setCargandoDireccion] = useState(true);

  // El cliente autenticado siempre manda sobre los datos de invitado
  useEffect(() => {
    if (loadingAuth) return;
    setInvitado(cliente ? null : getGuestCheckout());
    setInvitadoCargado(true);
  }, [cliente, loadingAuth]);

  const modo: ModoCheckout | null = cliente ? "cliente" : invitado ? "invitado" : null;

  useEffect(() => {
    if (loadingAuth || !invitadoCargado) return;

    let activo = true;

    const cargar = async () => {
      if (invitado) {
        if (activo) {
          setDireccionEnvio({
            nombre: invitado.nombre,
            apellidos: invitado.apellidos,
            empresa: invitado.empresa || "",
            nif: invitado.nif,
            telefono: invitado.telefono,
            direccion: invitado.direccion,
            direccionComplementaria: invitado.direccionComplementaria || "",
            codigoPostal: invitado.codigoPostal,
            ciudad: invitado.ciudad,
            provincia: invitado.provincia,
            pais: invitado.pais,
          });
          setCargandoDireccion(false);
        }
        return;
      }

      if (!cliente) {
        if (activo) {
          setDireccionEnvio(null);
          setCargandoDireccion(false);
        }
        return;
      }

      setCargandoDireccion(true);

      const fallback: DireccionEnvio = {
        nombre: cliente.nombre,
        apellidos: cliente.apellidos,
        empresa: cliente.empresa,
        nif: cliente.nif,
        telefono: cliente.telefono,
        direccion: cliente.direccion,
        direccionComplementaria: cliente.direccionComplementaria,
        codigoPostal: cliente.codigoPostal,
        ciudad: cliente.ciudad,
        provincia: cliente.provincia,
        pais: cliente.pais,
      };

      if (!token) {
        if (activo) {
          setDireccionEnvio(fallback);
          setCargandoDireccion(false);
        }
        return;
      }

      try {
        const res = await fetch("/api/clientes/direccion", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!activo) return;

        if (res.ok && data?.ok && data?.direccion) {
          setDireccionEnvio({
            nombre: cliente.nombre,
            apellidos: cliente.apellidos,
            empresa: data.direccion.empresa || cliente.empresa || "",
            nif: data.direccion.nif || cliente.nif || "",
            telefono: data.direccion.telefono || cliente.telefono || "",
            direccion: data.direccion.direccion || "",
            direccionComplementaria: data.direccion.direccionComplementaria || "",
            codigoPostal: data.direccion.codigoPostal || "",
            ciudad: data.direccion.ciudad || "",
            provincia: data.direccion.provincia || "",
            pais: data.direccion.pais || "España",
          });
        } else {
          setDireccionEnvio(fallback);
        }
      } catch {
        if (activo) setDireccionEnvio(fallback);
      } finally {
        if (activo) setCargandoDireccion(false);
      }
    };

    void cargar();

    return () => {
      activo = false;
    };
  }, [cliente, invitado, invitadoCargado, loadingAuth, token]);

  const refrescarInvitado = useCallback(() => {
    setInvitado(cliente ? null : getGuestCheckout());
  }, [cliente]);

  return {
    loading: loadingAuth || !invitadoCargado,
    cargandoDireccion,
    modo,
    esInvitado: modo === "invitado",
    cliente,
    invitado,
    token,
    direccionEnvio,
    /** Nombre y email a mostrar, venga de donde venga la identidad */
    email: cliente?.email ?? invitado?.email ?? "",
    nombre: cliente?.nombre ?? invitado?.nombre ?? "",
    apellidos: cliente?.apellidos ?? invitado?.apellidos ?? "",
    refrescarInvitado,
  };
}
