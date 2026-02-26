import mongoose, { Schema, model, models } from "mongoose";

const AdminSchema = new Schema(
  {
    nombre: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    rol: { type: String, default: "admin" },
  },
  { timestamps: true }
);

const Admin = models.Admin || model("Admin", AdminSchema);
export default Admin;
