import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({ 
    email: {
        type: String, 
        unique: true 
      
    },
    nombre: { type: String },
    apellido: { type: String },
    password: { type: String },
    resetPasswordToken: {
        type: String,  
    },
    resetPasswordExpires: {
        type: Date,  
    },
    avatar: { type: String }
});

export const User = mongoose.model("User", UserSchema);  
