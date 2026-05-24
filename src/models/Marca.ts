import mongoose from "mongoose";

const marcaSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: String,
  logo_url: String
});

const Marca = module.exports || mongoose.model('Marca', marcaSchema);

export default Marca;
