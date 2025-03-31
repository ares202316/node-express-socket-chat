import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({ 
    email: {
        type: String, 
        unique: true 
      
    },
    nombre: { type: String },
    apellido: { type: String },
    password: { type: String },
    avatar: { type: String }
});

export const User = mongoose.model("User", UserSchema);  
