import { Chat, ChatMessage} from "../models/index.js";

async function create(req, res) {
    try {
        const { participant_id_one, participant_id_two } = req.body;

       
        const foundOne = await Chat.findOne({
            participant_one: participant_id_one,
            participant_two: participant_id_two
        });

        const foundTwo = await Chat.findOne({
            participant_one: participant_id_two,
            participant_two: participant_id_one
        });

        if (foundOne || foundTwo) {
            return res.status(200).send({ msg: "Ya tiene un chat con este usuario" });
        }

      
        const chat = new Chat({
            participant_one: participant_id_one,
            participant_two: participant_id_two,
        });

        const chatStorage = await chat.save(); 

        res.status(201).send(chatStorage);
    } catch (error) {
        res.status(400).send({ msg: "Error al crear el chat", error });
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
        const user_id  = req.params.id; // Obtenemos el ID del usuario desde los parámetros
        console.log(user_id);
        const chats = await Chat.find({
            $or: [{ participant_one: user_id }, { participant_two: user_id }]
        })
        .populate("participant_one")
        .populate("participant_two")
        .exec();

        const filteredChats = [];
        for await (const chat of chats) {
            const lastMessage = await getLastMessage(chat._id);

            // Determinamos quién es el otro participante
            const otherParticipant = chat.participant_one._id.toString() === user_id
                ? chat.participant_two
                : chat.participant_one;

            filteredChats.push({
                _id: chat._id,
                participant: {
                    _id: otherParticipant._id,
                    email: otherParticipant.email,
                    nombre: otherParticipant.nombre || null,
                    apellido: otherParticipant.apellido || null,
                    avatar: otherParticipant.avatar || null
                },
                last_message_date: lastMessage?.createdAt || null,
                last_message: lastMessage || null
            });
        }

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
};