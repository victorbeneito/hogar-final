import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export interface ICliente extends mongoose.Document {
  nombre: string;
  apellidos: string;
  email: string;
  password: string;
  telefono?: string;
  empresa?: string;
  direccion?: string;
  direccionComplementaria?: string;
  codigoPostal?: string;
  ciudad?: string;
  provincia?: string;
  pais?: string;
  nif?: string;
  role?: string;
  comparePassword(password: string): Promise<boolean>;
}

const clienteSchema = new mongoose.Schema<ICliente>(
  {
    nombre: { type: String, required: true },
    apellidos: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    telefono: String,
    empresa: String,
    direccion: String,
    direccionComplementaria: String,
    codigoPostal: String,
    ciudad: String,
    pais: { type: String, default: "España" },
    provincia: String,
    nif: String,
    role: { type: String, default: "cliente" },
  },
  { timestamps: true }
);

// 🔒 Encriptar password antes de guardar
clienteSchema.pre("save", async function (this: any) {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});


// 🔐 Comparar contraseñas en login
clienteSchema.methods.comparePassword = function (password: string) {
  return bcrypt.compare(password, this.password);
};

clienteSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};


const Cliente =
  mongoose.models.Cliente || mongoose.model<ICliente>("Cliente", clienteSchema);

export default Cliente;

