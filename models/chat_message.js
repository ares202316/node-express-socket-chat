import mongoose from "mongoose";

const ChatMessagesSchema = new mongoose.Schema({
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "chat" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    message: String,
    type: { type: String, enum: ["TEXT", "IMAGE"] },
  }, { timestamps: true }); // Asegúrate de que esto esté aquí



export const ChatMessage = mongoose.model("ChatMessage" , ChatMessagesSchema);
