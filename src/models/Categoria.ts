import mongoose from "mongoose";

const categoriaSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: { type: String}
});

const Categoria =module.exports || mongoose.model('Categoria', categoriaSchema);

export default Categoria;
