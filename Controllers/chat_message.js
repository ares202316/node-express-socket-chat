import { log } from "console";
import { ChatMessage} from "../models/index.js";
import moment from 'moment-timezone';
import {io, getFilePath} from "../utils/index.js";
import Pusher from "pusher";
import PushNotifications from '@pusher/push-notifications-server'

const pusher = new Pusher({
  appId: "1969942",
  key: "5287c3152bf39d243e2e",
  secret: "d52985181809e6a4b67c",
  cluster: "us2",
  useTLS: true
});

const beamsClient = new PushNotifications({
    instanceId: '596e0803-3ebd-41f5-8521-868757c854c8',
    secretKey:  'D72BC9C989CD6D36280CFB83EAF480C675AA99FF403BE7DE16156691381ED056',
  })

  async function sendMessage(req, res) {
    try {
      const { chat_id, message, type = "TEXT" } = req.body
      const { user_id } = req.user
  
      // 1️⃣ Guardar el mensaje
      const chat_message = new ChatMessage({
        chat: chat_id,
        user: user_id,
        message,
        type,
        createdAt: moment().tz("America/Mexico_City").toDate(),
        updatedAt: moment().tz("America/Mexico_City").toDate(),
      })
      await chat_message.save()
      const data = await chat_message.populate("user")
  
      // 2️⃣ Emitir en Pusher al canal del chat
      pusher.trigger(`chat-${chat_id}`, "new-message", data)
  
      // 3️⃣ Preparar objeto de último mensaje
      const lastMessage = {
        _id:        chat_message._id,
        chat:       chat_message.chat,
        message:    chat_message.message,
        type:       chat_message.type,
        createdAt:  chat_message.createdAt
      }
  
      // 4️⃣ Emitir evento para actualizar pantalla de Chats
      pusher.trigger(`chat-${chat_id}`, "message_notify", {
        _id:          chat_id,
        last_message: lastMessage
      })
      // y también al canal personal del destinatario:
      // primero averigua quién es el otro participante:
      const chatDoc = await Chat.findById(chat_id)
      const otherUserId = chatDoc.participant_one.toString() === user_id
        ? chatDoc.participant_two.toString()
        : chatDoc.participant_one.toString()
  
      pusher.trigger(`${otherUserId}_notify`, "message_notify", {
        _id:          chat_id,
        last_message: lastMessage
      })
  
      // 5️⃣ ENVIAR PUSH POR BEAMS al interés del otro usuario
      //    (nota: el interés 'user-<id>' debe estar suscrito en cliente)
      await beamsClient.publishToInterests(
        [`user-${otherUserId}`],
        {
          web: {
            notification: {
              title: "Nuevo mensaje",
              body: `${data.user.nombre}: ${message}`,
              deep_link: `chatapp://chat/${chat_id}`
            }
          },
          fcm: {
            notification: {
              title: "Nuevo mensaje",
              body: `${data.user.nombre}: ${message}`
            },
            data: {
              chat_id,
              message_id: chat_message._id.toString()
            }
          }
        }
      )
  
      // 6️⃣ Responder al cliente
      res.status(201).send({ chat_message })
    } catch (error) {
      console.error("Error al enviar mensaje:", error)
      res.status(500).send({ msg: "Error al enviar el mensaje", error })
    }
  }

async function sendImage(req, res) {
    try {
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

        // 1️⃣ Buscar el mensaje
        const message = await ChatMessage.findById(messageId).populate("user");
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

        // 3️⃣ Emitir el evento usando Pusher
        pusher.trigger(`chat-${chatId}`, "message_deleted", {
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