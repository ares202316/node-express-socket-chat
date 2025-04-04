import { log } from "console";
import { ChatMessage} from "../models/index.js";
import moment from 'moment-timezone';
import {io, getFilePath} from "../utils/index.js";


async function sendMessage(req, res) {
    try {
        const { chat_id, message, type = "TEXT" } = req.body; // ← Añadimos el campo type
        const { user_id } = req.user;

        const chat_message = new ChatMessage({
            chat: chat_id,
            user: user_id,
            message,
            type, // ← Usamos el tipo recibido
            createdAt: moment().tz("America/Mexico_City").toDate(),
            updatedAt: moment().tz("America/Mexico_City").toDate(),
        });

        await chat_message.save();

        const data = await chat_message.populate("user");
        
        io.sockets.in(chat_id).emit("message", data);
        
        
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
        const mimetype = file.type; // <-- esta es la clave 🔑

        let type = "FILE"; // por defecto

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
            type
        });

        //await chat_message.save();
        const data = await chat_message.populate("user");
        console.log("📡 Emitiendo archivo por socket:", {
            chat_id,
            user_id,
            message: getFilePath(file),
            type
          });
        io.sockets.in(chat_id).emit("message", data);
       

        res.status(201).send({
            msg: `${type} enviado correctamente`,
            message_id: chat_message._id,
            message_path: chat_message.message  // ← Esta línea te dice cuál es la ruta final
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




export const ChatMessageController = {
    sendMessage,
    sendImage,
    getAll,
    getTotalMessage,
    getLastMessage,
  
    
};