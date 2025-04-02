import { log } from "console";
import { ChatMessage} from "../models/index.js";
import moment from 'moment-timezone';
import {io, getFilePath} from "../utils/index.js";


async function sendMessage(req, res) {
    try {
        const { chat_id, message } = req.body;
        const { user_id } = req.user;

      

        const chat_message = new ChatMessage({
            chat: chat_id,
            user: user_id,
            message,
            type: "TEXT",
            createdAt: moment().tz("America/Mexico_City").toDate(),
            updatedAt: moment().tz("America/Mexico_City").toDate(),
            
        });

        await chat_message.save();

        const data = await chat_message.populate("user");
        io.sockets.in(chat_id).emit("message", data);
        io.sockets.in(`${chat_id}_notify`).emit("message_notify", data);
        
        res.status(201).send({});
    } catch (error) {
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

        const chat_message = new ChatMessage({
            chat: chat_id,
            user: user_id,
            message: getFilePath(req.files.image), // Aquí usas `req.files.image`
            type: "IMAGE"
        });

        // Guardamos el mensaje en la base de datos
        await chat_message.save(); 

       
        const data = await chat_message.populate("user");

        // Emitimos los eventos a los sockets
        io.sockets.in(chat_id).emit("message", data);
        io.sockets.in(`${chat_id}_notify`).emit("message_notify", data);

        res.status(201).send({ msg: "Imagen enviada correctamente" });

    } catch (error) {
        console.error("Error al enviar imagen:", error);
        res.status(500).send({ msg: "Error interno al enviar la imagen" });
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