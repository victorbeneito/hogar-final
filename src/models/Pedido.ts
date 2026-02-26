import mongoose, { Schema, models } from "mongoose";

// --- Subesquema para productos del pedido ---
const ProductoSchema = new Schema({
  productoId: { type: String, required: true },
  nombre: { type: String, required: true },
  cantidad: { type: Number, required: true },
  precioUnitario: { type: Number, required: true },
  subtotal: { type: Number, required: true },
});

// --- Modelo principal de Pedido ---
const PedidoSchema = new Schema(
  {
    // Relación con cliente
    clienteId: { type: mongoose.Schema.Types.ObjectId, ref: "Cliente", required: true },

    // Datos del cliente (embebidos para historial)
    cliente: {
      nombre: { type: String, required: true },
      email: { type: String, required: true },
      telefono: { type: String },
      direccion: { type: String },
      ciudad: { type: String },
      cp: { type: String },
    },

    // Método de envío
    envio: {
      metodo: { type: String, required: true },
      coste: { type: Number, default: 0 },
    },

    // Método de pago
    pago: {
      metodo: { type: String, required: true },
      recargo: { type: Number, default: 0 },
      estadoPago: {
        type: String,
        enum: ["pendiente", "pagado", "fallido"],
        default: "pendiente",
      },
    },

    // Productos
    productos: [ProductoSchema],

    // Cupón aplicado (opcional)
    cupon: {
      codigo: { type: String },
      descuento: { type: Number },
    },

    // Totales y descuentos
    subtotal: { type: Number },
    descuento: { type: Number, default: 0 },
    totalFinal: { type: Number, required: true },

    // Estado general del pedido
    estado: {
      type: String,
      enum: ["pendiente", "procesando", "enviado", "entregado", "cancelado"],
      default: "pendiente",
    },

    // Número legible (tipo PED-2025-0001)
    numeroPedido: { type: String, unique: true },

    // Fecha del pedido
    fechaPedido: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// --- Middleware: genera automáticamente PED-YYYY-XXXX ---
PedidoSchema.pre("save", async function () {
  // Solo generar número cuando el pedido es nuevo
  if (this.isNew && !this.numeroPedido) {
    try {
      const anioActual = new Date().getFullYear();

      // Buscar el último pedido del mismo año
      const ultimo = await mongoose.models.Pedido.findOne(
        { numeroPedido: new RegExp(`PED-${anioActual}-\\d{4}$`) },
        { numeroPedido: 1 }
      )
        .sort({ createdAt: -1 })
        .lean();

      let nuevoNumero = 1;
      if (ultimo?.numeroPedido) {
        const coincidencia = ultimo.numeroPedido.match(/\d+$/);
        if (coincidencia) {
          const valorNum = parseInt(coincidencia[0], 10);
          if (!isNaN(valorNum)) nuevoNumero = valorNum + 1;
        }
      }

      this.numeroPedido = `PED-${anioActual}-${String(nuevoNumero).padStart(4, "0")}`;
    } catch (err) {
      console.error("Error generando número de pedido:", err);
      const anioFallback = new Date().getFullYear();
      this.numeroPedido = `PED-${anioFallback}-${String(Date.now()).slice(-4)}`;
    }
  }
});

const Pedido = models.Pedido || mongoose.model("Pedido", PedidoSchema);

export default Pedido;


