import { Chat, ChatMessage, User} from "../models/index.js";

import Pusher from "pusher";

const pusher = new Pusher({
  appId: "1969942",
  key: "5287c3152bf39d243e2e",
  secret: "d52985181809e6a4b67c",
  cluster: "us2",
  useTLS: true
});

async function create(req, res) {
    try {
      const { participant_id_one, participant_id_two } = req.body;
  
      // 1) Revisar si ya existe
      const exists = await Chat.findOne({
        $or: [
          { participant_one: participant_id_one, participant_two: participant_id_two },
          { participant_one: participant_id_two, participant_two: participant_id_one }
        ]
      });
      if (exists) return res.status(200).send({ msg: "Ya tienes un chat con este usuario" });
  
      // 2) Crear y guardar chat
      let chat = new Chat({ participant_one: participant_id_one, participant_two: participant_id_two });
      chat = await chat.save();
  
      // 3) Cargar datos del otro participante
      const otherId =
        chat.participant_one.toString() === participant_id_one
          ? chat.participant_two
          : chat.participant_one;
      const other = await User.findById(otherId).select("-password");
  
      // 4) Construir objeto completo que espera el cliente
      const payload = {
        _id: chat._id,
        participant: {
          _id: other._id,
          nombre: other.nombre,
          apellido: other.apellido,
          email: other.email,
          avatar: other.avatar
        },
        last_message: null,
        last_message_date: null
      };
  
      // 5) Emitir a ambos participantes
      pusher.trigger(`${participant_id_one}_notify`, "new-chat", payload);
      pusher.trigger(`${participant_id_two}_notify`, "new-chat", payload);
  
      return res.status(201).send(payload);
    } catch (error) {
      console.error("Error al crear chat:", error);
      return res.status(500).send({ msg: "Error al crear el chat", error });
    }
  }

async function getUsersWithoutChat(req, res) {
    try {
      const { user_id } = req.user;
  
      // Paso 1: Encontrar los chats donde el usuario actual es un participante
      const chats = await Chat.find({
        $or: [{ participant_one: user_id }, { participant_two: user_id }]
      }).select('participant_one participant_two');
  
      // Extraer los IDs de los participantes de esos chats
      const chatParticipantIds = chats.reduce((acc, chat) => {
        acc.add(chat.participant_one.toString());
        acc.add(chat.participant_two.toString());
        return acc;
      }, new Set());
  
      // Paso 2: Encontrar usuarios que no están en la lista de participantes de chats
      const usersWithoutChat = await User.find({
        _id: { $nin: [...chatParticipantIds, user_id] } // Excluir también al usuario actual
      }).select('-password'); // Excluir el campo de contraseña
  
      res.status(200).send(usersWithoutChat);
    } catch (error) {
      console.error("Error en getUsersWithoutChat:", error);
      res.status(500).send({ msg: "Error del servidor" });
    }
  }

async function getAll(req, res) {
    try {
        const { user_id } = req.user;

        const chats = await Chat.find({
            $or: [{ participant_one: user_id }, { participant_two: user_id }]
        })
        .populate("participant_one")
        .populate("participant_two")
        .exec(); 

        const arrayChats = [];
        for await (const chat of chats) {
            const response = await ChatMessage.findOne({ chat: chat._id })
                .sort({ createdAt: -1 });

            arrayChats.push({
                ...chat.toObject(), // <- Convertimos el documento Mongoose en objeto JS
                last_message_date: response?.createdAt || null,
            });
        }

        res.status(200).send(arrayChats); // Enviamos el array modificado
    } catch (error) {
        console.error("Error en getAll:", error);
        res.status(400).send({ msg: "Error al obtener los chats", error });
    }
}

async function deleteChat(req, res) {
    try {
        const chat_id = req.params.id;
        

        const chatDeleted = await Chat.findByIdAndDelete(chat_id);

        if (!chatDeleted) {
            return res.status(400).send({ msg: "No se encontró el chat" });
        }

        res.status(200).send({ msg: "Chat eliminado" });
    } catch (error) {
        res.status(500).send({ msg: "Error del servidor", error });
    }
}

async function getChat(req, res) {
    try {
        const chat_id = req.params.id;

        const chatStorage = await Chat.findById(chat_id)
            .populate("participant_one")
            .populate("participant_two");

        if (!chatStorage) {
            return res.status(404).send({ msg: "Chat no encontrado" });
        }

        res.status(200).send(chatStorage);
    } catch (error) {
        res.status(500).send({ msg: "Error del servidor", error });
    }
}

async function getChatsFiltered(req, res) {
    try {
        const user_id = req.params.id;
        console.log("User ID recibido:", user_id);

        // Obtener los chats del usuario
        const chats = await Chat.find({
            $or: [{ participant_one: user_id }, { participant_two: user_id }]
        })
        .populate("participant_one")
        .populate("participant_two")
        .exec();

        const filteredChats = [];
        for (let chat of chats) {
            const lastMessage = await getLastMessage(chat._id);

            // Determinamos quién es el otro participante
            const otherParticipant = chat.participant_one._id.toString() === user_id
                ? chat.participant_two
                : chat.participant_one;

            // Añadimos el chat con el último mensaje
            filteredChats.push({
                _id: chat._id,
                participant: {
                    _id: otherParticipant._id,
                    email: otherParticipant.email,
                    nombre: otherParticipant.nombre || "",
                    apellido: otherParticipant.apellido || "",
                    avatar: otherParticipant.avatar || ""
                },
                last_message_date: lastMessage ? lastMessage.createdAt : null,
                last_message: lastMessage || null
            });
        }

        // Ordenar los chats por el último mensaje (de más reciente a más antiguo)
        filteredChats.sort((a, b) => {
            const dateA = new Date(a.last_message_date);
            const dateB = new Date(b.last_message_date);
            return dateB - dateA; // Orden descendente por fecha
        });

        // Enviar los chats filtrados al frontend
        res.status(200).send(filteredChats);
    } catch (error) {
        console.error("Error en getChatsFiltered:", error);
        res.status(400).send({ msg: "Error al obtener los chats", error });
    }
}

async function getLastMessage(chat_id) {
    try {
        return await ChatMessage.findOne({ chat: chat_id }).sort({ createdAt: -1 });
    } catch (error) {
        console.error("Error al obtener el último mensaje:", error);
        return null;
    }
}




export const ChatController = {
    create,
    getAll,
    deleteChat,
    getChat,
    getChatsFiltered,
    getLastMessage,
    getUsersWithoutChat,
};