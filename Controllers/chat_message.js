import { log } from "console";
import { ChatMessage} from "../models/index.js";
import moment from 'moment-timezone';
import {io, getFilePath} from "../utils/index.js";
import Pusher from "pusher";
const pusher = new Pusher({
  appId: "1969942",
  key: "5287c3152bf39d243e2e",
  secret: "d52985181809e6a4b67c",
  cluster: "us2",
  useTLS: true
});

async function sendMessage(req, res) {
    try {
        const { chat_id, message, type = "TEXT" } = req.body;
        const { user_id } = req.user;

        const chat_message = new ChatMessage({
            chat: chat_id,
            user: user_id,
            message,
            type,
            createdAt: moment().tz("America/Mexico_City").toDate(),
            updatedAt: moment().tz("America/Mexico_City").toDate(),
        });

        await chat_message.save();
        const data = await chat_message.populate("user");

        // Emitir con Pusher
        pusher.trigger(`chat-${chat_id}`, "new-message", data);

        res.status(201).send({});
    } catch (error) {
        console.error("Error al enviar mensaje:", error);
        res.status(400).send({ msg: "Error al enviar el mensaje", error });
    }
}

async function sendImage(req, res) {
    try {
        console.log("Archivos recibidos:", req.files);
        console.log("Body recibido:", req.body);

        if (!req.files || !req.files.image) {
            return res.status(400).send({ msg: "No se recibió ninguna imagen" });
        }

        const { chat_id } = req.body;
        const { user_id } = req.user;
        const file = req.files.image;
        const mimetype = file.type;

        let type = "FILE";
        if (mimetype.startsWith("image/")) {
            type = "IMAGE";
        } else if (mimetype.startsWith("video/")) {
            type = "VIDEO";
        } else if (mimetype.startsWith("audio/")) {
            type = "AUDIO";
        }

        const chat_message = new ChatMessage({
            chat: chat_id,
            user: user_id,
            message: getFilePath(file),
            type,
            createdAt: moment().tz("America/Mexico_City").toDate(),
            updatedAt: moment().tz("America/Mexico_City").toDate(),
        });

        await chat_message.save();
        const data = await chat_message.populate("user");

        // Emitir por Pusher
        console.log("📡 Emitiendo archivo por Pusher:", {
            chat_id,
            user_id,
            message: getFilePath(file),
            type
        });

        pusher.trigger(`chat-${chat_id}`, "new-message", data);

        res.status(201).send({
            msg: `${type} enviado correctamente`,
            message_id: chat_message._id,
            message_path: chat_message.message
        });

    } catch (error) {
        console.error("Error al enviar archivo:", error);
        res.status(500).send({ msg: "Error interno al enviar el archivo" });
    }
}

async function getAll(req, res){
    const {chat_id} = req.params;
    try{
        const messages = await ChatMessage.find({chat: chat_id}).sort({createdAt: 1,}).populate("user");

        const total = await ChatMessage.countDocuments({ chat: chat_id });

        res.status(200).send({messages, total});
    }catch(error){
        console.log(error);
        res.status(500).send({msg: "Error del servidor"});
    }
}




async function getTotalMessage(req,res){
    const {chat_id} = req.params;

    try{
        const response = await ChatMessage.countDocuments({ chat: chat_id });

        res.status(200).send(JSON.stringify(response));

    }catch(error){
        res.status(500).send({msg: "Error del servidor"});
    }
}

async function getLastMessage(req, res) {
    const { chat_id } = req.params;

    try {
        const response = await ChatMessage.findOne({ chat: chat_id })
            .sort({ createdAt: -1 }); 

        res.status(200).send(JSON.stringify(response));
    } catch (error) {
        res.status(500).send({ msg: "Error del servidor" });
    }
}  

async function deleteMessageSocket(req, res) {
    try {
        const messageId = req.params.id;
        console.log("🧾 ID del mensaje recibido para eliminar:", messageId);

        // 1️⃣ Buscar el mensaje antes de eliminar
        const message = await ChatMessage.findById(messageId);
        if (!message) {
            console.log("⚠️ No se encontró el mensaje con ID:", messageId);
            return res.status(404).send({ msg: "Mensaje no encontrado" });
        }

        const chatId = message.chat?.toString();
        console.log("💬 Chat ID asociado al mensaje:", chatId);

        if (!chatId) {
            console.log("❌ El mensaje no tiene campo 'chat'");
            return res.status(500).send({ msg: "El mensaje no tiene chat asociado" });
        }

        // 2️⃣ Eliminar el mensaje
        await ChatMessage.findByIdAndDelete(messageId);
        console.log("🗑️ Mensaje eliminado con ID:", message._id);

        // 3️⃣ Emitir a la sala correspondiente
        req.io.to(chatId).emit("message_deleted", {
            _id: message._id,
            chat: chatId
        });
        console.log("📢 Emitido message_deleted al chat:", chatId);

        res.status(200).send({ msg: "Mensaje eliminado", messageId: message._id });

    } catch (error) {
        console.error("❌ Error en deleteMessageSocket:", error);
        res.status(500).send({ msg: "Error del servidor", error });
    }
}


export const ChatMessageController = {
    sendMessage,
    sendImage,
    getAll,
    getTotalMessage,
    getLastMessage,
    deleteMessageSocket,
  
    
};