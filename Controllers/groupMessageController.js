import { GroupMessage } from "../models/index.js";
import PushNotifications from "@pusher/push-notifications-server"
import Pusher from "pusher";
import { getFilePath } from "../utils/image.js";



const pusher = new Pusher({
  appId: "1969942",
  key: "5287c3152bf39d243e2e",
  secret: "d52985181809e6a4b67c",
  cluster: "us2",
  useTLS: true
});

const beamsClient = new PushNotifications({
    instanceId: '596e0803-3ebd-41f5-8521-868757c854c8',
    secretKey: 'D72BC9C989CD6D36280CFB83EAF480C675AA99FF403BE7DE16156691381ED056',
  });

pusher.trigger("my-channel", "my-event", {
  message: "hello world"
});

// Enviar mensaje de texto
async function sendGroupMessage(req, res) {
    try {
      const { groupId, message } = req.body;
      const userId = req.user.user_id;
  
      if (!message || message.trim() === "") {
        return res.status(400).send({ msg: "El mensaje no puede estar vacío" });
      }
  
      // Guardar el mensaje en MongoDB
      const newMessage = await GroupMessage.create({
        group: groupId,
        user: userId,
        message,
        type: "TEXT"
      });
  
      // Obtener el mensaje completo con datos del usuario
      const data = await GroupMessage.findById(newMessage._id).populate("user");
  
      // Emitir mensaje en tiempo real a los usuarios conectados
      pusher.trigger(`group-${groupId}`, "new-message", data);
  
      // Preparar nombre del usuario para la notificación
      const userName = data.user?.nombre || "Alguien";
  
      // Enviar notificación push a los dispositivos suscritos a este grupo
      await beamsClient.publishToInterests([`group-${groupId}`], {
        web: {
          notification: {
            title: "Nuevo mensaje en el grupo",
            body: `${userName} dijo: ${message}`,
            deep_link: `chatapp://group/${groupId}`
          }
        },
        fcm: {
          notification: {
            title: "Nuevo mensaje en el grupo",
            body: `${userName} dijo: ${message}`
          }
        }
      });
  
      // Éxito
      res.status(201).send({ message: data });
  
    } catch (error) {
      console.error("❌ Error al enviar mensaje:", error);
      res.status(500).send({ msg: "Error al enviar mensaje", error });
    }
  }



// Obtener mensajes de un grupo
async function getGroupMessages(req, res) {
    try {
        const groupId = req.params.groupId;

        const messages = await GroupMessage.find({ group: groupId }).populate("user");
        res.status(200).send({ messages });
    } catch (error) {
        res.status(500).send({ msg: "Error al obtener mensajes", error });
    }
}

// Total de mensajes
async function countGroupMessages(req, res) {
    try {
        const groupId = req.params.groupId;
        const count = await GroupMessage.countDocuments({ group: groupId });

        res.status(200).send({ count });
    } catch (error) {
        res.status(500).send({ msg: "Error al contar mensajes", error });
    }
}

// Último mensaje
 async function lastGroupMessage(req, res) {
    try {
        const groupId = req.params.groupId;

        const last = await GroupMessage.findOne({ group: groupId }).sort({ createdAt: -1 }).populate("user");
        res.status(200).send({ message: last });
    } catch (error) {
        res.status(500).send({ msg: "Error al obtener último mensaje", error });
    }
}

async function sendGroupFile(req, res) {
    try {
        if (!req.files || !req.files.image) {
            return res.status(400).send({ msg: "No se recibió ninguna imagen" });
        }

        const { group_id } = req.body;
        const { user_id } = req.user;
        const file = req.files.image;

        const mimetype = file.type || file.mimetype;

        if (!mimetype) {
            return res.status(400).send({ msg: "Tipo de archivo no reconocido" });
        }

        console.log("📄 Archivo recibido:", file);

        let type = "FILE";
        if (mimetype.startsWith("image/")) {
            type = "IMAGE";
        } else if (mimetype.startsWith("video/")) {
            type = "VIDEO";
        } else if (mimetype.startsWith("audio/")) {
            type = "AUDIO";
        }

        const groupMessage = new GroupMessage({
            group: group_id,
            user: user_id,
            message: getFilePath(file),
            type
        });

        await groupMessage.save();
        const data = await groupMessage.populate("user");

        pusher.trigger(`group-${group_id}`, "new-group-message", data);
        console.log(data);

        res.status(201).send({
            msg: `${type} enviado correctamente`,
            message_id: groupMessage._id,
            message_path: groupMessage.message
        });

    } catch (error) {
        console.error("❌ Error al enviar archivo al grupo:", error);
        res.status(500).send({ msg: "Error interno al enviar el archivo" });
    }
}


async function deleteGroupMessage(req, res) {
    try {
        const messageId = req.params.id;
        const userId = req.user.user_id; // <- aquí estaba el problema

        const message = await GroupMessage.findById(messageId);

        if (!message) {
            return res.status(404).send({ msg: "Mensaje no encontrado" });
        }

        if (message.user.toString() !== userId) {
            return res.status(403).send({ msg: "No autorizado para eliminar este mensaje" });
        }

        await GroupMessage.findByIdAndDelete(messageId);

        // Emitir evento de eliminación
        pusher.trigger(`group-${message.group}`, "group-message-deleted", {
            messageId,
            groupId: message.group
        });

        res.status(200).send({ msg: "Mensaje eliminado correctamente" });
    } catch (error) {
        console.error("❌ Error al eliminar mensaje:", error);
        res.status(500).send({ msg: "Error al eliminar mensaje", error });
    }
}

export const GroupMessageController = {
    deleteGroupMessage,
    sendGroupFile,
    lastGroupMessage,
    sendGroupMessage,
    getGroupMessages,
    countGroupMessages,
   
};