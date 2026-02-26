// @ts-nocheck
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function vincularPedidos() {
  console.log("🔗 Iniciando vinculación de pedidos por Email...");
  
  // 1. Cargamos todos los pedidos y todos los clientes
  const pedidos = await prisma.pedido.findMany();
  const clientes = await prisma.cliente.findMany();
  
  console.log(`📋 Analizando ${pedidos.length} pedidos contra ${clientes.length} clientes...`);

  let actualizados = 0;

  for (const pedido of pedidos) {
    // Si el pedido no tiene email guardado, saltamos
    if (!pedido.email) continue;

    // Buscamos si existe un cliente registrado con ese email 
    // (usamos toLowerCase() para evitar problemas de mayúsculas)
    const clienteDueño = clientes.find(c => c.email.toLowerCase() === pedido.email.toLowerCase());

    if (clienteDueño) {
      // Si el pedido ya tiene el ID correcto, no hacemos nada
      if (pedido.clienteId === clienteDueño.id) continue;

      // ¡ENCONTRADO! El pedido estaba asignado a otro (ID 1 Juan) y debe ser de este cliente
      console.log(`🔄 Re-asignando Pedido ${pedido.numeroPedido || pedido.id}:`);
      console.log(`   📧 Email: ${pedido.email}`);
      console.log(`   👤 Cambio: ClienteID ${pedido.clienteId} ➡️  ClienteID ${clienteDueño.id} (${clienteDueño.nombre})`);

      // Actualizamos la base de datos
      await prisma.pedido.update({
        where: { id: pedido.id },
        data: { clienteId: clienteDueño.id }
      });

      actualizados++;
    }
  }

  console.log("\n------------------------------------------------");
  console.log(`🎉 ¡PROCESO TERMINADO!`);
  console.log(`✅ Se han movido ${actualizados} pedidos a sus dueños reales.`);
  console.log("------------------------------------------------");
}

vincularPedidos()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });