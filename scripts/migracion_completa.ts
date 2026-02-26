import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper para fechas
const d = (fecha: string) => new Date(fecha);

async function main() {
  console.log('🚀 Iniciando MIGRACIÓN COMPLETA de Clientes y Pedidos...');

  // 1. LIMPIEZA (Borramos pedidos y clientes antiguos para meter los limpios)
  // NOTA: NO borramos 'Usuario' para no cargarme tu login de Admin.
  try {
    console.log('🗑️  Limpiando datos previos...');
    await prisma.pedidoProducto.deleteMany({});
    await prisma.pedido.deleteMany({});
    await prisma.cupon.deleteMany({});
    // Ojo: Si tienes claves foráneas, primero borramos pedidos, luego clientes.
    await prisma.cliente.deleteMany({});
  } catch (error) {
    console.log('⚠️  Tablas ya vacías o aviso menor.');
  }

  // 2. INSERTAR TODOS LOS CLIENTES
  console.log('👥 Insertando 12 Clientes...');
  await prisma.cliente.createMany({
    data: [
      { id: 1, nombre: 'Juan', apellidos: 'Sanchez', email: 'juansanchez|@gmail.com', password: '$2b$10$mo/9iZkJammLoYzr67OVRuMqdmwlsS.4f59r4JsE6B2WtA5tWfAle', telefono: '748526859', direccion: 'Sant Joan, 27', codigoPostal: '46700', ciudad: 'Xativa', provincia: 'Valencia', pais: 'España', nif: '85235874K', role: 'cliente' },
      { id: 2, nombre: 'Victor', apellidos: 'Beneito', email: 'victorblluch@gmail.com', password: '$2b$10$blEAnMSkS/ZlIJtpIN1JS.J4z0Audo3eymVFMAhLKq1t1liDE63Ta', telefono: '669863866', role: 'cliente' },
      { id: 4, nombre: 'Luis ', apellidos: 'Lopez', email: 'luislopez@gmail.com', password: '$2b$10$dNceth84hYz/NF6EiUM8UObbXMDE.0OrhK7jLlQ3OzyYlRbXIIezK', telefono: '687528962', direccion: 'Tirador, 47', ciudad: 'Ontinyent', role: 'cliente' },
      { id: 5, nombre: 'Luis', apellidos: 'Martinez', email: 'luismartinez@gmail.com', password: '$2b$10$NWcWLzlcVdAgPDNeKt3aQOGoYdtoT18kCxHJqCYx5mgi8SWQUSIj.', telefono: '675423189', direccion: 'Sant Antoni, 27', ciudad: 'Ontinyent', role: 'cliente' },
      { id: 6, nombre: 'Silvia', apellidos: 'Perez', email: 'silviaperez@gmail.com', password: '$2b$10$i2d6CbA9nJPScYgcWy4CZuhpDYOWEyaorMjQj6fk43tDz2Y/Nh7Le', role: 'cliente' },
      { id: 7, nombre: 'Ana', apellidos: 'Lopez', email: 'analopez@gmail.com', password: '$2b$10$R9qmw5oq2reiXm/Fn1w/TuT7LA.bg31qBuFGmpBe6cMeSEJrvXOXi', telefono: '654236748', direccion: 'jose perez, 73', ciudad: 'Bocairent', role: 'cliente' },
      { id: 8, nombre: 'Laia', apellidos: 'Beneito', email: 'laiabeneito@gmail.com', password: '$2b$10$EuhLU6qkNWhiaLnKG5jn.u5RfxADHKlmXylGTKZXDS5290HFcfdiy', telefono: '674859752', direccion: 'Daniel Gil, 27', codigoPostal: '46660', ciudad: 'Ontinyent', provincia: 'Valencia', role: 'cliente' },
      { id: 9, nombre: 'Salva', apellidos: 'Pla', email: 'salvapla@gmail.com', password: '$2b$10$4E.MjJZZoSuhwAbx9ZYqUumqpv0pueNJLTSqlFEc0dmDo1hxOHaLG', telefono: '968563785', direccion: 'La Roda, 27', codigoPostal: '46500', ciudad: 'Alcobendas', role: 'cliente' },
      { id: 10, nombre: 'Juan', apellidos: 'Soler', email: 'juansoler@gmail.com', password: '$2b$10$SLTrXg0R1doTAPshdIVdeO8XsysCJmlSa2Gcgv.Rib7vYAxSIA.Di', telefono: '674852152', direccion: 'Santa Ana, 27', ciudad: 'Anna', role: 'cliente' },
      { id: 11, nombre: 'joel', apellidos: 'diaz', email: 'joeldiaz@gmail.com', password: '$2b$10$re0bafXFNHstZDW9awpgQOM2yAaDdB0yDUJ9MI1zcdtwuG1.wHvRC', telefono: '674523856', direccion: 'Pais Valencia, 27', ciudad: 'Xativa', role: 'cliente' },
      { id: 12, nombre: 'Lara', apellidos: 'Perez', email: 'laraperez@gmail.com', password: '$2b$10$lTA9uQwaBy8NI0kVeH4gEemffRlNP5Lj5PLWauxU2/nCn1bERyXsy', telefono: '985236854', direccion: 'Torrefiel, 27 bajo', codigoPostal: '03850', ciudad: 'Alcoi', provincia: 'Alacant', role: 'cliente' },
      { id: 13, nombre: 'Virtudes', apellidos: 'Soler', email: 'virtudessoler@gmail.com', password: '$2b$10$ycxOH3C0P04j0NsOuoCaqerlaVZ7f5wh0fP4pQkeyX75/x55eLMZC', telefono: '647859635', direccion: 'Mayans, 15', codigoPostal: '46800', ciudad: 'Agullent', provincia: 'Valencia', role: 'cliente' },
    ]
  });

  // 3. INSERTAR TODOS LOS PEDIDOS
  console.log('📦 Insertando 33 Pedidos...');
  await prisma.pedido.createMany({
    data: [
      { id: 1, numeroPedido: 'PED-1767865823559', clienteId: 1, nombre: 'Juan', email: 'juansanchez|@gmail.com', telefono: '748526859', direccion: 'Sant Joan, 27', ciudad: 'Xativa', cp: '46700', envioMetodo: 'Estándar', envioCoste: 0, pagoMetodo: 'Tarjeta', estadoPago: 'PENDIENTE', subtotal: 102.79, totalFinal: 102.79, estado: 'PENDIENTE', fechaPedido: d('2026-01-08T09:50:23.562Z') },
      { id: 2, numeroPedido: 'PED-0001', clienteId: 1, nombre: 'Cliente Importado', email: 'noemail@importado.com', envioMetodo: 'ontime', envioCoste: 5, pagoMetodo: 'paypal', estadoPago: 'PENDIENTE', subtotal: 0, totalFinal: 0, estado: 'PENDIENTE', fechaPedido: d('2025-12-19T17:45:22.267Z') },
      { id: 3, numeroPedido: 'PED-0002', clienteId: 1, nombre: 'Cliente Importado', email: 'noemail@importado.com', envioMetodo: 'ontime', envioCoste: 5, pagoMetodo: 'tarjeta', estadoPago: 'PENDIENTE', subtotal: 0, totalFinal: 0, estado: 'PENDIENTE', fechaPedido: d('2025-12-19T17:47:03.557Z') },
      { id: 4, numeroPedido: 'PED-0003', clienteId: 1, nombre: 'Cliente Importado', email: 'noemail@importado.com', envioMetodo: 'ontime', envioCoste: 5, pagoMetodo: 'paypal', estadoPago: 'PENDIENTE', subtotal: 0, totalFinal: 0, estado: 'PENDIENTE', fechaPedido: d('2025-12-19T17:55:05.592Z') },
      { id: 5, numeroPedido: 'PED-0004', clienteId: 7, nombre: 'Ana Lopez', email: 'analopez@gmail.com', telefono: '654236748', envioMetodo: 'ontime', envioCoste: 5, pagoMetodo: 'paypal', estadoPago: 'PENDIENTE', subtotal: 0, totalFinal: 0, estado: 'PENDIENTE', fechaPedido: d('2025-12-19T18:26:21.262Z') },
      { id: 6, numeroPedido: 'PED-0005', clienteId: 7, nombre: 'Ana Lopez', email: 'analopez@gmail.com', telefono: '654236748', envioMetodo: 'ontime', envioCoste: 5, pagoMetodo: 'paypal', estadoPago: 'PENDIENTE', subtotal: 0, totalFinal: 0, estado: 'PENDIENTE', fechaPedido: d('2025-12-19T18:26:21.278Z') },
      { id: 7, numeroPedido: 'PED-0006', clienteId: 7, nombre: 'Ana Lopez', email: 'analopez@gmail.com', telefono: '654236748', envioMetodo: 'ontime', envioCoste: 5, pagoMetodo: 'paypal', estadoPago: 'PENDIENTE', subtotal: 0, totalFinal: 0, estado: 'PENDIENTE', fechaPedido: d('2025-12-19T19:07:30.496Z') },
      { id: 8, numeroPedido: 'PED-0007', clienteId: 7, nombre: 'Ana Lopez', email: 'analopez@gmail.com', telefono: '654236748', envioMetodo: 'ontime', envioCoste: 5, pagoMetodo: 'paypal', estadoPago: 'PENDIENTE', subtotal: 0, totalFinal: 0, estado: 'PENDIENTE', fechaPedido: d('2025-12-19T19:07:30.529Z') },
      { id: 9, numeroPedido: 'OLD-6949752f63485ab82c813373', clienteId: 5, nombre: 'Luis Martinez', email: 'luismartinez@gmail.com', telefono: '675423189', envioMetodo: 'ontime', envioCoste: 5, pagoMetodo: 'bizum', estadoPago: 'PENDIENTE', subtotal: 0, totalFinal: 0, estado: 'PENDIENTE', fechaPedido: d('2025-12-22T16:43:27.042Z') },
      { id: 10, numeroPedido: 'PED-2025-0001', clienteId: 5, nombre: 'Luis Martinez', email: 'luismartinez@gmail.com', telefono: '675423189', direccion: 'Sant Antoni, 27', ciudad: 'Ontinyent', envioMetodo: 'ontime', envioCoste: 5, pagoMetodo: 'paypal', estadoPago: 'PENDIENTE', subtotal: 80.81, totalFinal: 80.81, estado: 'PENDIENTE', fechaPedido: d('2025-12-23T08:12:09.521Z') },
      { id: 11, numeroPedido: 'PED-2025-0002', clienteId: 5, nombre: 'Luis Martinez', email: 'luismartinez@gmail.com', telefono: '675423189', direccion: 'Sant Antoni, 27', ciudad: 'Ontinyent', envioMetodo: 'ontime', envioCoste: 5, pagoMetodo: 'tarjeta', estadoPago: 'PENDIENTE', subtotal: 17.95, totalFinal: 17.95, estado: 'PENDIENTE', fechaPedido: d('2025-12-23T08:26:57.696Z') },
      { id: 12, numeroPedido: 'PED-2025-0003', clienteId: 7, nombre: 'Ana Lopez', email: 'analopez@gmail.com', telefono: '654236748', direccion: 'jose perez, 73', ciudad: 'Bocairent', envioMetodo: 'ontime', envioCoste: 5, pagoMetodo: 'paypal', estadoPago: 'PENDIENTE', subtotal: 322.99, totalFinal: 322.99, estado: 'PENDIENTE', fechaPedido: d('2025-12-24T12:16:15.714Z') },
      { id: 13, numeroPedido: 'PED-2025-0004', clienteId: 7, nombre: 'Ana Lopez', email: 'analopez@gmail.com', telefono: '654236748', direccion: 'jose perez, 73', ciudad: 'Bocairent', envioMetodo: 'ontime', envioCoste: 5, pagoMetodo: 'paypal', estadoPago: 'PENDIENTE', subtotal: 102.79, totalFinal: 102.79, estado: 'PENDIENTE', fechaPedido: d('2025-12-26T17:08:04.488Z') },
      { id: 14, numeroPedido: 'PED-2025-0005', clienteId: 8, nombre: 'Laia Beneito', email: 'laiabeneito@gmail.com', telefono: '674859752', direccion: 'Daniel Gil, 27', ciudad: 'Ontinyent', envioMetodo: 'ontime', envioCoste: 5, pagoMetodo: 'transferencia', estadoPago: 'PENDIENTE', subtotal: 134.59, totalFinal: 134.59, estado: 'PENDIENTE', fechaPedido: d('2025-12-26T17:21:00.220Z') },
      { id: 15, numeroPedido: 'PED-2025-0006', clienteId: 8, nombre: 'Laia Beneito', email: 'laiabeneito@gmail.com', telefono: '674859752', direccion: 'Daniel Gil, 27', ciudad: 'Ontinyent', envioMetodo: 'ontime', envioCoste: 5, pagoMetodo: 'tarjeta', estadoPago: 'PENDIENTE', subtotal: 94.4, totalFinal: 94.4, estado: 'PENDIENTE', fechaPedido: d('2025-12-26T17:22:01.337Z') },
      { id: 16, numeroPedido: 'PED-2025-0007', clienteId: 4, nombre: 'Luis  Lopez', email: 'luislopez@gmail.com', telefono: '687528962', direccion: 'Tirador, 47', ciudad: 'Ontinyent', envioMetodo: 'ontime', envioCoste: 5, pagoMetodo: 'paypal', estadoPago: 'PENDIENTE', subtotal: 29.6, totalFinal: 29.6, estado: 'PENDIENTE', fechaPedido: d('2025-12-26T17:43:28.311Z') },
      { id: 17, numeroPedido: 'PED-2025-0008', clienteId: 8, nombre: 'Laia Beneito', email: 'laiabeneito@gmail.com', telefono: '674859752', direccion: 'Daniel Gil, 27', ciudad: 'Ontinyent', envioMetodo: 'ontime', envioCoste: 5, pagoMetodo: 'paypal', estadoPago: 'PENDIENTE', subtotal: 207.14, totalFinal: 207.14, estado: 'PENDIENTE', fechaPedido: d('2025-12-26T18:58:30.741Z') },
      { id: 18, numeroPedido: 'PED-2025-0009', clienteId: 8, nombre: 'Laia Beneito', email: 'laiabeneito@gmail.com', telefono: '674859752', direccion: 'Daniel Gil, 27', ciudad: 'Ontinyent', envioMetodo: 'ontime', envioCoste: 5, pagoMetodo: 'paypal', estadoPago: 'PENDIENTE', subtotal: 144.55, totalFinal: 144.55, estado: 'PENDIENTE', fechaPedido: d('2025-12-26T19:25:14.978Z') },
      { id: 19, numeroPedido: 'PED-2025-0010', clienteId: 7, nombre: 'Ana Lopez', email: 'analopez@gmail.com', telefono: '654236748', direccion: 'jose perez, 73', ciudad: 'Bocairent', envioMetodo: 'ontime', envioCoste: 5, pagoMetodo: 'paypal', estadoPago: 'PENDIENTE', subtotal: 64.99, totalFinal: 64.99, estado: 'PENDIENTE', fechaPedido: d('2025-12-26T19:26:36.407Z') },
      { id: 20, numeroPedido: 'PED-2025-0011', clienteId: 8, nombre: 'Laia Beneito', email: 'laiabeneito@gmail.com', telefono: '674859752', direccion: 'Daniel Gil, 27', ciudad: 'Ontinyent', envioMetodo: 'ontime', envioCoste: 5, pagoMetodo: 'paypal', estadoPago: 'PENDIENTE', subtotal: 48.7, totalFinal: 48.7, estado: 'PENDIENTE', fechaPedido: d('2025-12-29T16:06:51.711Z') },
      { id: 21, numeroPedido: 'PED-2025-0012', clienteId: 7, nombre: 'Ana Lopez', email: 'analopez@gmail.com', telefono: '654236748', direccion: 'jose perez, 73', ciudad: 'Bocairent', envioMetodo: 'ontime', envioCoste: 5, pagoMetodo: 'paypal', estadoPago: 'PENDIENTE', subtotal: 47.05, totalFinal: 47.05, estado: 'PENDIENTE', fechaPedido: d('2025-12-29T16:07:48.464Z') },
      { id: 22, numeroPedido: 'PED-2025-0013', clienteId: 9, nombre: 'Salva Pla', email: 'salvapla@gmail.com', telefono: '968563785', direccion: 'La Roda, 27', ciudad: 'Alcobendas', envioMetodo: 'ontime', envioCoste: 5, pagoMetodo: 'tarjeta', estadoPago: 'PENDIENTE', subtotal: 64.99, totalFinal: 64.99, estado: 'PENDIENTE', fechaPedido: d('2025-12-29T16:09:21.876Z') },
      { id: 23, numeroPedido: 'PED-2025-0014', clienteId: 7, nombre: 'Ana Lopez', email: 'analopez@gmail.com', telefono: '654236748', direccion: 'jose perez, 73', ciudad: 'Bocairent', envioMetodo: 'tienda', envioCoste: 0, pagoMetodo: 'paypal', estadoPago: 'PENDIENTE', subtotal: 119.98, totalFinal: 119.98, estado: 'ENTREGADO', fechaPedido: d('2025-12-29T16:14:38.716Z') },
      { id: 24, numeroPedido: 'PED-2025-0015', clienteId: 8, nombre: 'Laia Beneito', email: 'laiabeneito@gmail.com', telefono: '674859752', direccion: 'Daniel Gil, 27', ciudad: 'Ontinyent', cp: '46870', envioMetodo: 'ontime', envioCoste: 5, pagoMetodo: 'tarjeta', estadoPago: 'PENDIENTE', subtotal: 88.65, totalFinal: 88.65, estado: 'PENDIENTE', fechaPedido: d('2025-12-31T09:39:53.520Z') },
      { id: 25, numeroPedido: 'PED-2025-0016', clienteId: 10, nombre: 'Juan Soler', email: 'juansoler@gmail.com', telefono: '674852152', direccion: 'Santa Ana, 27', ciudad: 'Anna', cp: '46750', envioMetodo: 'tienda', envioCoste: 0, pagoMetodo: 'paypal', estadoPago: 'PENDIENTE', subtotal: 131.94, totalFinal: 131.94, estado: 'PENDIENTE', fechaPedido: d('2025-12-31T09:41:42.990Z') },
      { id: 26, numeroPedido: 'PED-2025-0017', clienteId: 10, nombre: 'Juan Soler', email: 'juansoler@gmail.com', telefono: '674852152', direccion: 'Santa Ana, 27', ciudad: 'Anna', cp: '46750', envioMetodo: 'ontime', envioCoste: 5, pagoMetodo: 'bizum', estadoPago: 'PENDIENTE', subtotal: 64.99, totalFinal: 64.99, estado: 'PENDIENTE', fechaPedido: d('2025-12-31T09:42:00.289Z') },
      { id: 27, numeroPedido: 'PED-2025-0018', clienteId: 7, nombre: 'Ana Lopez', email: 'analopez@gmail.com', telefono: '654236748', direccion: 'jose perez, 73', ciudad: 'Bocairent', cp: '46800', envioMetodo: 'ontime', envioCoste: 5, pagoMetodo: 'transferencia', estadoPago: 'PENDIENTE', subtotal: 39.25, totalFinal: 39.25, estado: 'PENDIENTE', fechaPedido: d('2025-12-31T09:43:19.948Z') },
      { id: 28, numeroPedido: 'PED-2025-0019', clienteId: 7, nombre: 'Ana Lopez', email: 'analopez@gmail.com', telefono: '654236748', direccion: 'jose perez, 73', ciudad: 'Bocairent', cp: '46800', envioMetodo: 'ontime', envioCoste: 5, pagoMetodo: 'tarjeta', estadoPago: 'PENDIENTE', subtotal: 63.85, totalFinal: 63.85, estado: 'PENDIENTE', fechaPedido: d('2025-12-31T10:01:10.561Z') },
      { id: 29, numeroPedido: 'PED-2025-0020', clienteId: 11, nombre: 'joel diaz', email: 'joeldiaz@gmail.com', telefono: '674523856', direccion: 'Pais Valencia, 27', ciudad: 'Xativa', cp: '46800', envioMetodo: 'tienda', envioCoste: 0, pagoMetodo: 'tarjeta', estadoPago: 'PENDIENTE', subtotal: 59.99, totalFinal: 59.99, estado: 'ENVIADO', fechaPedido: d('2025-12-31T10:03:37.840Z') },
      { id: 30, numeroPedido: 'PED-2026-0001', clienteId: 11, nombre: 'joel diaz', email: 'joeldiaz@gmail.com', telefono: '674523856', direccion: 'Pais Valencia, 27', ciudad: 'Xativa', cp: '46800', envioMetodo: 'tienda', envioCoste: 0, pagoMetodo: 'paypal', estadoPago: 'PENDIENTE', subtotal: 111.29, totalFinal: 111.29, estado: 'PENDIENTE', fechaPedido: d('2026-01-08T14:51:59.776Z') },
      { id: 31, numeroPedido: 'PED-2026-0002', clienteId: 8, nombre: 'Laia Beneito', email: 'laiabeneito@gmail.com', telefono: '674859752', direccion: 'Daniel Gil, 27', ciudad: 'Ontinyent', cp: '46870', envioMetodo: 'ontime', envioCoste: 5, pagoMetodo: 'tarjeta', estadoPago: 'PENDIENTE', subtotal: 102.79, totalFinal: 102.79, estado: 'PENDIENTE', fechaPedido: d('2026-01-08T16:08:46.285Z') },
      { id: 32, numeroPedido: 'PED-1767952646557', clienteId: 12, nombre: 'Lara', email: 'laraperez@gmail.com', telefono: '985236854', direccion: 'Torrefiel, 27 bajo', ciudad: 'Alcoi', cp: '03850', envioMetodo: 'Estándar', envioCoste: 0, pagoMetodo: 'Tarjeta', estadoPago: 'PENDIENTE', subtotal: 0, totalFinal: 81.75, estado: 'PENDIENTE', fechaPedido: d('2026-01-09T09:57:26.568Z') },
      { id: 33, numeroPedido: 'PED-1767971668380', clienteId: 13, nombre: 'Virtudes', email: 'virtudessoler@gmail.com', telefono: '647859635', direccion: 'Mayans, 15', ciudad: 'Agullent', cp: '46800', envioMetodo: 'Estándar', envioCoste: 0, pagoMetodo: 'Tarjeta', estadoPago: 'PENDIENTE', subtotal: 0, totalFinal: 52.6, estado: 'PENDIENTE', fechaPedido: d('2026-01-09T15:14:28.384Z') },
    ]
  });

  // 4. INSERTAR PRODUCTOS EN LOS PEDIDOS
  console.log('🛒 Insertando detalle de productos en pedidos...');
  await prisma.pedidoProducto.createMany({
    data: [
      { pedidoId: 1, nombre: 'Funda sofá Tunez', cantidad: 1, precioUnitario: 37.8, subtotal: 37.8 },
      { pedidoId: 1, nombre: 'Estor digital HSCP93006', cantidad: 1, precioUnitario: 59.99, subtotal: 59.99 },
      { pedidoId: 2, nombre: 'Estor digital HSCJ6868', cantidad: 2, precioUnitario: 59.99, subtotal: 119.98 },
      { pedidoId: 2, nombre: 'Estor digital HSCC91002', cantidad: 1, precioUnitario: 59.99, subtotal: 59.99 },
      { pedidoId: 3, nombre: 'Estor liso Lira', cantidad: 1, precioUnitario: 34.25, subtotal: 34.25 },
      { pedidoId: 3, nombre: 'Estor digital HSCC20503', cantidad: 1, precioUnitario: 59.99, subtotal: 59.99 },
      { pedidoId: 4, nombre: 'Estor digital HSCC20503', cantidad: 1, precioUnitario: 59.99, subtotal: 59.99 },
      { pedidoId: 4, nombre: 'Estor Digital HSCP20303', cantidad: 1, precioUnitario: 59.99, subtotal: 59.99 },
      { pedidoId: 5, nombre: 'Estor digital HSCC20503', cantidad: 1, precioUnitario: 59.99, subtotal: 59.99 },
      { pedidoId: 6, nombre: 'Estor digital HSCC20503', cantidad: 1, precioUnitario: 59.99, subtotal: 59.99 },
      { pedidoId: 7, nombre: 'Estor liso Lira', cantidad: 1, precioUnitario: 34.25, subtotal: 34.25 },
      { pedidoId: 7, nombre: 'Cojin estampado Oasis', cantidad: 1, precioUnitario: 24.6, subtotal: 24.6 },
      { pedidoId: 8, nombre: 'Estor liso Lira', cantidad: 1, precioUnitario: 34.25, subtotal: 34.25 },
      { pedidoId: 8, nombre: 'Cojin estampado Oasis', cantidad: 1, precioUnitario: 24.6, subtotal: 24.6 },
      { pedidoId: 9, nombre: 'Estor liso Lira', cantidad: 1, precioUnitario: 34.25, subtotal: 34.25 },
      { pedidoId: 9, nombre: 'Estor digital HSCI97004 definitivo', cantidad: 1, precioUnitario: 73, subtotal: 73 },
      { pedidoId: 9, nombre: 'Mantel liso Sevilla', cantidad: 1, precioUnitario: 17.45, subtotal: 17.45 },
      { pedidoId: 10, nombre: 'Estor Liso Ara', cantidad: 1, precioUnitario: 23.66, subtotal: 23.66 },
      { pedidoId: 10, nombre: 'Colcha Mijas', cantidad: 1, precioUnitario: 52.15, subtotal: 52.15 },
      { pedidoId: 11, nombre: 'Cojin liso Porto', cantidad: 1, precioUnitario: 12.95, subtotal: 12.95 },
      { pedidoId: 12, nombre: 'Estor digital HSCI97004 definitivo', cantidad: 1, precioUnitario: 81, subtotal: 81 },
      { pedidoId: 12, nombre: 'Funda Sofá Elegant', cantidad: 1, precioUnitario: 51.3, subtotal: 51.3 },
      { pedidoId: 12, nombre: 'Cojin estampado Oasis', cantidad: 1, precioUnitario: 24.6, subtotal: 24.6 },
      { pedidoId: 12, nombre: 'Mantel liso Sevilla', cantidad: 1, precioUnitario: 17.45, subtotal: 17.45 },
      { pedidoId: 12, nombre: 'Estor digital HSCJ6868', cantidad: 1, precioUnitario: 59.99, subtotal: 59.99 },
      { pedidoId: 12, nombre: 'Estor digital HSCC20503', cantidad: 1, precioUnitario: 59.99, subtotal: 59.99 },
      { pedidoId: 12, nombre: 'Estor Liso Ara', cantidad: 1, precioUnitario: 23.66, subtotal: 23.66 },
      { pedidoId: 13, nombre: 'Estor digital HSCC20503', cantidad: 1, precioUnitario: 59.99, subtotal: 59.99 },
      { pedidoId: 13, nombre: 'Funda sofá Tunez', cantidad: 1, precioUnitario: 37.8, subtotal: 37.8 },
      { pedidoId: 14, nombre: 'Estor Digital HSCP20303', cantidad: 1, precioUnitario: 59.99, subtotal: 59.99 },
      { pedidoId: 14, nombre: 'Mantel liso Sevilla', cantidad: 1, precioUnitario: 17.45, subtotal: 17.45 },
      { pedidoId: 14, nombre: 'Colcha Mijas', cantidad: 1, precioUnitario: 52.15, subtotal: 52.15 },
      { pedidoId: 15, nombre: 'Funda nórdica Harry', cantidad: 1, precioUnitario: 71.95, subtotal: 71.95 },
      { pedidoId: 15, nombre: 'Mantel liso Sevilla', cantidad: 1, precioUnitario: 17.45, subtotal: 17.45 },
      { pedidoId: 16, nombre: 'Cojin estampado Oasis', cantidad: 1, precioUnitario: 24.6, subtotal: 24.6 },
      { pedidoId: 17, nombre: 'Estor digital HSCI97011', cantidad: 1, precioUnitario: 59.99, subtotal: 59.99 },
      { pedidoId: 17, nombre: 'Estor digital HSCI97004 definitivo', cantidad: 1, precioUnitario: 81, subtotal: 81 },
      { pedidoId: 17, nombre: 'Funda sofá Malta', cantidad: 1, precioUnitario: 43.7, subtotal: 43.7 },
      { pedidoId: 17, nombre: 'Mantel liso Sevilla', cantidad: 1, precioUnitario: 17.45, subtotal: 17.45 },
      { pedidoId: 18, nombre: 'Funda sofá Malta', cantidad: 2, precioUnitario: 43.7, subtotal: 87.4 },
      { pedidoId: 18, nombre: 'Colcha Mijas', cantidad: 1, precioUnitario: 52.15, subtotal: 52.15 },
      { pedidoId: 19, nombre: 'Estor digital HSCC20503', cantidad: 1, precioUnitario: 59.99, subtotal: 59.99 },
      { pedidoId: 20, nombre: 'Funda sofá Malta', cantidad: 1, precioUnitario: 43.7, subtotal: 43.7 },
      { pedidoId: 21, nombre: 'Cojin estampado Oasis', cantidad: 1, precioUnitario: 24.6, subtotal: 24.6 },
      { pedidoId: 21, nombre: 'Mantel liso Sevilla', cantidad: 1, precioUnitario: 17.45, subtotal: 17.45 },
      { pedidoId: 22, nombre: 'Estor digital HSCC20503', cantidad: 1, precioUnitario: 59.99, subtotal: 59.99 },
      { pedidoId: 23, nombre: 'Estor digital HSCC20503', cantidad: 1, precioUnitario: 59.99, subtotal: 59.99 },
      { pedidoId: 23, nombre: 'Estor digital HSCJ6868', cantidad: 1, precioUnitario: 59.99, subtotal: 59.99 },
      { pedidoId: 24, nombre: 'Estor digital HSCJ6868', cantidad: 1, precioUnitario: 59.99, subtotal: 59.99 },
      { pedidoId: 24, nombre: 'Estor Liso Ara', cantidad: 1, precioUnitario: 23.66, subtotal: 23.66 },
      { pedidoId: 25, nombre: 'Funda nórdica Harry', cantidad: 1, precioUnitario: 71.95, subtotal: 71.95 },
      { pedidoId: 25, nombre: 'Estor digital HSCU92005', cantidad: 1, precioUnitario: 59.99, subtotal: 59.99 },
      { pedidoId: 26, nombre: 'Estor digital HSCC20503', cantidad: 1, precioUnitario: 59.99, subtotal: 59.99 },
      { pedidoId: 27, nombre: 'Estor liso Lira', cantidad: 1, precioUnitario: 34.25, subtotal: 34.25 },
      { pedidoId: 28, nombre: 'Estor liso Lira', cantidad: 1, precioUnitario: 34.25, subtotal: 34.25 },
      { pedidoId: 28, nombre: 'Cojin estampado Oasis', cantidad: 1, precioUnitario: 24.6, subtotal: 24.6 },
      { pedidoId: 29, nombre: 'Estor digital HSCJ6868', cantidad: 1, precioUnitario: 59.99, subtotal: 59.99 },
      { pedidoId: 30, nombre: 'Estor digital HSCC20503 mod', cantidad: 1, precioUnitario: 59.99, subtotal: 59.99 },
      { pedidoId: 30, nombre: 'Funda Sofá Elegant', cantidad: 1, precioUnitario: 51.3, subtotal: 51.3 },
      { pedidoId: 31, nombre: 'Estor digital HSCC20503 mod', cantidad: 1, precioUnitario: 59.99, subtotal: 59.99 },
      { pedidoId: 31, nombre: 'Funda sofá Tunez', cantidad: 1, precioUnitario: 37.8, subtotal: 37.8 },
      { pedidoId: 32, nombre: 'Cojin estampado Oasis', cantidad: 1, precioUnitario: 24.6, subtotal: 24.6 },
      { pedidoId: 32, nombre: 'Colcha Mijas', cantidad: 1, precioUnitario: 52.15, subtotal: 52.15 },
      { pedidoId: 33, nombre: 'Colcha algodón Banús', cantidad: 1, precioUnitario: 47.6, subtotal: 47.6 }
    ]
  });

  console.log('✅ ¡MIGRACIÓN COMPLETADA! Clientes, Pedidos y Productos restaurados.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });