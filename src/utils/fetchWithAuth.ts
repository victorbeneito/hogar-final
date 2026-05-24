export async function fetchWithAuth(url: string, token: string, options: RequestInit = {}) {
  // 1. Limpieza preventiva del token en el Frontend
  // Quitamos comillas dobles o simples si se han colado al guardarlo
  const cleanToken = token ? token.replace(/['"]+/g, '').trim() : "";

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
    // 2. Construimos la cabecera Authorization correctamente
    Authorization: `Bearer ${cleanToken}`,
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  // Intentamos parsear la respuesta
  // Si la API no devuelve JSON (devuelve error HTML), esto evita que explote con "Unexpected end of JSON"
  let data;
  try {
    data = await res.json();
  } catch (error) {
    // Si falla el parseo, devolvemos un error genérico
    return { error: `Error de servidor (${res.status})` };
  }

  return data;
}