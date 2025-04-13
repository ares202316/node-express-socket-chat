import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({ 
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    trim: true
  },
  nombre: { type: String },
  apellido: { type: String },
  carrera: { type: String },
  cuenta: { type: String },
  sede: { type: String },
  password: { type: String, required: true },
  avatar: { type: String },

  // 🔒 Recuperación de contraseña
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },

  // ✅ Verificación de cuenta por correo
  verified: {
    type: Boolean,
    default: false
  },
  verifyToken: {
    type: String
  },
  verifyExpires: {
    type: Date
  }
});

export const User = mongoose.model("User", UserSchema);
