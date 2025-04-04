import mongoose from "mongoose";
import { server } from "./app.js";
import { PORT, IP_SERVER, DB_USER, DB_PASSWORD, DB_HOST } from "./constants.js";
import { Server } from "socket.io";
import moment from "moment-timezone";
import { ChatMessage } from "./models/index.js"; // Ajusta a tu ruta real
import { emitChatUpdate } from "./utils/emitChatUpdate.js";

const mongoDbUrl = `mongodb+srv://${DB_USER}:${DB_PASSWORD}@${DB_HOST}`;

mongoose.connect(mongoDbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log("Conectado a MongoDB");

    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    server.listen(PORT, () => {
        console.log("####################");
        console.log("###### API REST ####");
        console.log("####################");
        console.log(`http://${IP_SERVER}:${PORT}/api`);
    });

    //  Socket.IO conexión
    io.on("connection", (socket) => {
        console.log("🔌 NUEVO CLIENTE CONECTADO");
    
        socket.on("subscribe", (room) => {
            socket.join(room);
            console.log(`📡 Cliente unido a la sala: ${room}`);
        });
    
        socket.on("disconnect", () => {
            console.log("❌ Cliente desconectado");
        });
    
        socket.on("send_message", async (data) => {
            console.log(`📨 Mensaje recibido en socket desde: ${data.user_id}, en chat: ${data.chat_id}`);
    
            const { chat_id, user_id, message, type = "TEXT" } = data;
    
            const chat_message = new ChatMessage({
                chat: chat_id,
                user: user_id,
                message,
                type,
                createdAt: moment().tz("America/Mexico_City").toDate(),
                updatedAt: moment().tz("America/Mexico_City").toDate(),
            });
    
            await chat_message.save();
            const populated = await chat_message.populate("user");
    
            console.log(`📢 Emitiendo mensaje a sala: ${chat_id}`);
            io.to(chat_id).emit("message", populated);
            await emitChatUpdate(io, chat_id, user_id);
        });

            socket.on("send_file", async (data) => {
                try {
                    const { chat_id, user_id, message, type } = data;
            
                    const chat_message = new ChatMessage({
                        chat: chat_id,
                        user: user_id,
                        message,
                        type,
                        createdAt: moment().tz("America/Mexico_City").toDate(),
                        updatedAt: moment().tz("America/Mexico_City").toDate(),
                    });
            
                    await chat_message.save();
                    const populated = await chat_message.populate("user");
            
                    console.log(`📡 Emitiendo ${type} a la sala:`, chat_id);
                    io.to(chat_id).emit("message", populated); 
                } catch (error) {
                    console.error("❌ Error al enviar archivo por socket:", error);
                }
            });
        

    });




})
.catch((error) => {
    console.error("Error conectando a MongoDB:", error);
    process.exit(1);
}); 