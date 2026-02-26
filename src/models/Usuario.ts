import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// 🧩 Define la interfaz con el campo 'rol'
export interface IUsuario extends mongoose.Document {
  nombre?: string;
  email: string;
  password: string;
  rol: "cliente" | "admin";
  comparePassword(password: string): Promise<boolean>;
}

const UsuarioSchema = new mongoose.Schema<IUsuario>(
  {
    nombre: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    // 👇 Nuevo campo de rol para diferenciar usuarios
    rol: {
      type: String,
      enum: ["cliente", "admin"],
      default: "cliente",
    },
  },
  { timestamps: true }
);

// 🔒 Encriptar password antes de guardar
UsuarioSchema.pre("save", async function (this: any) {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// 🔐 Método para comparar contraseñas
UsuarioSchema.methods.comparePassword = function (password: string) {
  return bcrypt.compare(password, this.password);
};

// ✅ Usa modelo existente si ya fue declarado (Next.js HMR fix)
const Usuario =
  mongoose.models.Usuario || mongoose.model<IUsuario>("Usuario", UsuarioSchema);

export default Usuario;
;



// const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');

// const UsuarioSchema = new mongoose.Schema({
//   email: { type: String, required: true, unique: true, lowercase: true, trim: true },
//   password: { type: String, required: true },
// });

// // Encriptar la contraseña antes de guardar
// UsuarioSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) return next();
//   this.password = await bcrypt.hash(this.password, 10);
//   next();
// });

// // Método para comparar contraseñas
// UsuarioSchema.methods.comparePassword = function(password) {
//   return bcrypt.compare(password, this.password);
// };

// module.exports = mongoose.model('Usuario', UsuarioSchema);
