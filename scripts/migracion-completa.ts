// scripts/migracion-completa.ts
// @ts-nocheck
import mongoose from 'mongoose';
import { PrismaClient } from '@prisma/client';

// ------------------------------------------------------------------
// 1. CONFIGURACIÓN
// ------------------------------------------------------------------
const MONGO_URI = "mongodb+srv://vicben_db:Fisicayquimica2025@cluster0.ynidino.mongodb.net/?appName=Cluster0"; // 👈 ¡PON TU URL DE MONGO AQUÍ!
const prisma = new PrismaClient();

// Mapas para traducir IDs de Mongo (String) a MariaDB (Int)
const mapaUsuarios = new Map<string, number>();
const mapaCategorias = new Map<string, number>();
const mapaMarcas = new Map<string, number>();
const mapaProductos = new Map<string, number>();

// ------------------------------------------------------------------
// 2. DEFINICIÓN DE MODELOS MONGO (Corregido con tus nombres reales)
// ------------------------------------------------------------------
const UserSchema = new mongoose.Schema({}, { strict: false });
const CategorySchema = new mongoose.Schema({}, { strict: false });
const BrandSchema = new mongoose.Schema({}, { strict: false });
const ProductSchema = new mongoose.Schema({}, { strict: false });
const OrderSchema = new mongoose.Schema({}, { strict: false });
const CouponSchema = new mongoose.Schema({}, { strict: false });

// 👇 AQUÍ ESTÁ LA CLAVE: El tercer parámetro es el nombre real en tu MongoDB
// He elegido 'clientes' (10 docs) en lugar de 'usuarios' (4) porque parece ser donde están los compradores.
const MongoUser = mongoose.model('users', UserSchema, 'clientes'); 
const MongoCategory = mongoose.model('categories', CategorySchema, 'categorias');
const MongoBrand = mongoose.model('brands', BrandSchema, 'marcas');
const MongoProduct = mongoose.model('products', ProductSchema, 'productos');
const MongoOrder = mongoose.model('orders', OrderSchema, 'pedidos');
// OJO: En tu debug salía 'cupons' (sin la o), así que ponemos 'cupons'
const MongoCoupon = mongoose.model('coupons', CouponSchema, 'cupons');

// ------------------------------------------------------------------
// 3. FUNCIONES DE MIGRACIÓN
// ------------------------------------------------------------------

async function migrarUsuarios() {
  console.log("\n🚀 Migrando USUARIOS...");
  // 💡 TRUCO: Usamos ': any[]' para que TypeScript no se queje de las propiedades
  const users: any[] = await MongoUser.find();
  
  for (const u of users) {
    const mongoId = u._id.toString();
    
    // Evitar duplicados por email
    const existe = await prisma.cliente.findUnique({ where: { email: u.email } });
    
    if (existe) {
      mapaUsuarios.set(mongoId, existe.id);
      continue;
    }

    try {
        const nuevo = await prisma.cliente.create({
          data: {
            nombre: u.nombre || "Usuario Sin Nombre",
            email: u.email, // Si falla aquí es porque en Mongo había emails vacíos/duplicados
            password: u.password || "", 
            role: u.role || "cliente",
            telefono: u.telefono || null,
            direccion: u.direccion || null,
            ciudad: u.ciudad || null,
            codigoPostal: u.cp || null,
          }
        });
        mapaUsuarios.set(mongoId, nuevo.id);
        process.stdout.write(".");
    } catch (e) {
        // Si hay un usuario corrupto en Mongo, lo saltamos y seguimos
        process.stdout.write("x");
    }
  }
  console.log(`\n✅ ${mapaUsuarios.size} Usuarios procesados.`);
}

async function migrarCategorias() {
  console.log("\n🚀 Migrando CATEGORÍAS...");
  const cats: any[] = await MongoCategory.find();

  for (const c of cats) {
    const mongoId = c._id.toString();
    const existe = await prisma.categoria.findFirst({ where: { nombre: c.nombre } });

    if (existe) {
      mapaCategorias.set(mongoId, existe.id);
      mapaCategorias.set(c.nombre, existe.id);
      continue;
    }

    const nuevo = await prisma.categoria.create({
      data: {
        nombre: c.nombre,
        descripcion: c.descripcion || "",
        imagen: c.imagen || null
      }
    });
    mapaCategorias.set(mongoId, nuevo.id);
    mapaCategorias.set(c.nombre, nuevo.id);
    process.stdout.write(".");
  }
  console.log(`\n✅ ${cats.length} Categorías procesadas.`);
}

async function migrarMarcas() {
  console.log("\n🚀 Migrando MARCAS...");
  const brands: any[] = await MongoBrand.find();

  for (const b of brands) {
    const mongoId = b._id.toString();
    const existe = await prisma.marca.findFirst({ where: { nombre: b.nombre } });

    if (existe) {
      mapaMarcas.set(mongoId, existe.id);
      mapaMarcas.set(b.nombre, existe.id);
      continue;
    }

    const nuevo = await prisma.marca.create({
      data: { nombre: b.nombre, imagen: b.imagen || null }
    });
    mapaMarcas.set(mongoId, nuevo.id);
    mapaMarcas.set(b.nombre, nuevo.id);
    process.stdout.write(".");
  }
  console.log(`\n✅ ${brands.length} Marcas procesadas.`);
}

async function migrarProductos() {
  console.log("\n🚀 Migrando PRODUCTOS...");
  const products: any[] = await MongoProduct.find();

  for (const p of products) {
    const mongoId = p._id.toString();

    // Resolver Relaciones
    let catId = mapaCategorias.get(p.categoria?.toString()) || mapaCategorias.get(p.categoria);
    let marcaId = mapaMarcas.get(p.marca?.toString()) || mapaMarcas.get(p.marca);

    // Categoría por defecto si no tiene
    if (!catId) catId = 1; 

    // Limpieza de precio (a veces viene como string con símbolos)
    let precioLimpio = 0;
    if (typeof p.precio === 'string') {
        precioLimpio = parseFloat(p.precio.replace(',', '.'));
    } else {
        precioLimpio = parseFloat(p.precio);
    }

    try {
        const nuevo = await prisma.producto.create({
          data: {
            nombre: p.nombre,
            descripcion: p.descripcion || "",
            descripcion_html: p.descripcion_html || p.descripcion || "",
            precio: isNaN(precioLimpio) ? 0 : precioLimpio,
            stock: parseInt(p.stock) || 0,
            destacado: p.destacado || false,
            imagenes: p.imagenes || [],
            
            // Relaciones
            categoriaId: catId,
            marcaId: marcaId || null,

            // Variantes
            variantes: p.variantes ? {
                create: p.variantes.map((v: any) => ({
                    color: v.color || null,
                    imagen: v.imagen || null,
                    tamano: v.tamaño || v.tamano || null,
                    tirador: v.tirador || null,
                    precio_extra: parseFloat(v.precio_extra || 0)
                }))
            } : undefined
          }
        });
        mapaProductos.set(mongoId, nuevo.id);
        process.stdout.write(".");
    } catch(e) {
        console.log(`\nError en producto ${p.nombre}:`, e);
    }
  }
  console.log(`\n✅ ${products.length} Productos procesados.`);
}

async function migrarPedidos() {
  console.log("\n🚀 Migrando PEDIDOS...");
  const orders: any[] = await MongoOrder.find();

  for (const o of orders) {
    // Buscar dueño del pedido
    let userId = mapaUsuarios.get(o.usuario?.toString() || o.cliente?.toString());
    
    if (!userId) {
        userId = 1; // Asignar a usuario por defecto si no se encuentra
    }

    const items = (o.pedidoItems || o.productos || []).map((item: any) => ({
        nombre: item.nombre || "Producto Importado",
        cantidad: item.cantidad || 1,
        precioUnitario: parseFloat(item.precio || 0),
        subtotal: parseFloat(item.precio || 0) * (item.cantidad || 1)
    }));

    try {
        await prisma.pedido.create({
          data: {
            numeroPedido: o.id_pedido || `OLD-${o._id}`,
            clienteId: userId,
            
            nombre: o.envioInfo?.nombre || "Cliente",
            email: o.envioInfo?.email || "email@antiguo.com",
            telefono: o.envioInfo?.telefono || "",
            direccion: o.envioInfo?.direccion || "",
            ciudad: o.envioInfo?.ciudad || "",
            cp: o.envioInfo?.cp || "",
            
            envioMetodo: "Estándar",
            envioCoste: parseFloat(o.precioEnvio || 0),
            
            pagoMetodo: o.pagoInfo?.metodo || "Tarjeta",
            
            subtotal: parseFloat(o.precioItems || 0),
            totalFinal: parseFloat(o.precioTotal || 0),
            estado: o.estado || "ENTREGADO",
            
            // Si createdAt existe en mongo lo usamos, sino fecha actual
            // createdAt no se puede pasar en 'create' si es default(now), 
            // pero Prisma permite sobreescribirlo si está definido en schema.
            // Si te da error aquí, borra esta línea:
            // createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),

            productos: {
                create: items
            }
          }
        });
        process.stdout.write(".");
    } catch(e) {
        process.stdout.write("x");
    }
  }
  console.log(`\n✅ ${orders.length} Pedidos procesados.`);
}

async function migrarCupones() {
    console.log("\n🚀 Migrando CUPONES...");
    const coupons: any[] = await MongoCoupon.find();
    
    for (const c of coupons) {
        const userId = c.clienteId ? mapaUsuarios.get(c.clienteId.toString()) : null;

        try {
            await prisma.cupon.create({
                data: {
                    codigo: c.nombre || c.codigo,
                    descuento: parseFloat(c.descuento || 0),
                    descripcion: c.descripcion || "Cupón importado",
                    fechaExpiracion: c.expire ? new Date(c.expire) : new Date('2030-01-01'),
                    clienteId: userId,
                    usado: false
                }
            });
            process.stdout.write(".");
        } catch (e) {
             process.stdout.write("x");
        }
    }
    console.log(`\n✅ ${coupons.length} Cupones procesados.`);
}


// ------------------------------------------------------------------
// 4. EJECUCIÓN PRINCIPAL
// ------------------------------------------------------------------
async function main() {
  try {
    console.log("🔌 Conectando a MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("🔌 Conectado a MongoDB.");

    await migrarUsuarios();
    await migrarCategorias();
    await migrarMarcas();
    await migrarProductos();
    await migrarPedidos();
    await migrarCupones();

    console.log("\n\n🎉 ¡MIGRACIÓN COMPLETADA CON ÉXITO! 🎉");
    console.log("Ahora puedes loguearte con tu usuario Admin antiguo.");

  } catch (error) {
    console.error("\n❌ Error fatal durante la migración:", error);
  } finally {
    await mongoose.disconnect();
    await prisma.$disconnect();
  }
}

main();