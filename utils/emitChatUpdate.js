import { Chat } from "../models/index.js";
import { ChatController  } from "../Controllers/index.js";

export async function emitChatUpdate(io, chat_id, user_id) {

    
    try {
        const chat = await Chat.findById(chat_id)
            .populate("participant_one")
            .populate("participant_two");
        
            const ChChatControlleratC = ChatController.getLastMessageñ
        const lastMessage = await ChChatControlleratC(chat_id);

        const otherParticipant = chat.participant_one._id.toString() === user_id
            ? chat.participant_two
            : chat.participant_one;

        const payload = {
            _id: chat._id,
            participant: {
                _id: otherParticipant._id,
                email: otherParticipant.email,
                nombre: otherParticipant.nombre || null,
                apellido: otherParticipant.apellido || null,
                avatar: otherParticipant.avatar || null
            },
            last_message_date: lastMessage?.createdAt || null,
            last_message: lastMessage
        };

        io.to(`${chat_id}_notify`).emit("chat_updated", payload);
    } catch (err) {
        console.error("❌ Error al emitir chat_updated:", err);
    }
}
