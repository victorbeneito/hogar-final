import mongoose from "mongoose";

const varianteSchema = new mongoose.Schema({
  color: String,
  imagen: String,
  tamaño: String,
  tirador: String,
  precio_extra: Number
});

const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: String,
  descripcion_html: { type: String },
  precio: { type: Number, required: true },
  stock: Number,
  marca: { type: mongoose.Schema.Types.ObjectId, ref: 'Marca' },
  categoria: { type: mongoose.Schema.Types.ObjectId, ref: 'Categoria' },
  variantes: [varianteSchema],
  imagenes: { type: [String], default: [] },
  destacado: Boolean
});

const Producto = module.exports || mongoose.model('Producto', productoSchema);

export default Producto;