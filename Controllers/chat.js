import { Chat } from "../models/index.js";

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
        .exec(); // Se usa exec() correctamente

        res.status(200).send(chats);
    } catch (error) {
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


export const ChatController = {
    create,
    getAll,
    deleteChat,
    getChat,
};