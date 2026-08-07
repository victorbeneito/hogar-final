import { prisma } from "@/lib/prisma";

interface PedidoParaUrl {
  numeroPedido?: string | null;
  email?: string | null;
}

/**
 * Enlace "Ver mi pedido" de los emails.
 *
 * Los clientes con cuenta van a su historial; los invitados no pueden iniciar
 * sesión, así que reciben el seguimiento público (referencia + email).
 */
export async function buildPedidoUrl(appUrl: string, pedido: PedidoParaUrl): Promise<string> {
  const historial = `${appUrl}/account/orders`;

  if (!pedido?.numeroPedido || !pedido.email) return historial;

  try {
    const encontrado = await prisma.pedido.findUnique({
      where: { numeroPedido: pedido.numeroPedido },
      select: { cliente: { select: { esInvitado: true } } },
    });

    if (!encontrado?.cliente?.esInvitado) return historial;

    const params = new URLSearchParams({ ref: pedido.numeroPedido, email: pedido.email });
    return `${appUrl}/pedido/seguimiento?${params.toString()}`;
  } catch {
    return historial;
  }
}
