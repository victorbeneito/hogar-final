import mongoose, { Schema, models } from "mongoose";

const CuponSchema = new Schema(
  {
    codigo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    descripcion: { type: String, default: "" },
    descuento: { type: Number, required: true }, // en %
    fechaExpiracion: { type: Date, required: true },
    usado: { type: Boolean, default: false }, // global
    clienteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cliente",
    }, // opcional para cupón exclusivo
    // 👇 nuevo: lista de clientes que ya lo usaron
    clientesUsados: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Cliente",
      },
    ],
  },
  { timestamps: true }
);

// Evita OverwriteModelError
const Cupon = models.Cupon || mongoose.model("Cupon", CuponSchema);

export default Cupon;
