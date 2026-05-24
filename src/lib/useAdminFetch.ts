/**
 * Hook para hacer fetch en APIs admin con manejo automático de errores 403
 * Si el usuario no tiene permiso, muestra alerta y no ejecuta el callback de éxito
 */
export function useAdminFetch() {
  const secureFetch = async (
    url: string,
    options: RequestInit = {}
  ): Promise<{ ok: boolean; data?: any; error?: string }> => {
    try {
      const res = await fetch(url, options);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const error = data.error || `Error ${res.status}`;

        // Si es 403, mostrar alerta específica
        if (res.status === 403) {
          alert(`No tienes permiso: ${error}`);
        } else {
          alert(`Error: ${error}`);
        }

        return { ok: false, error };
      }

      const data = await res.json().catch(() => ({}));
      return { ok: true, data };
    } catch (err: any) {
      const error = err.message || "Error de conexión";
      alert(`Error: ${error}`);
      return { ok: false, error };
    }
  };

  return { secureFetch };
}
