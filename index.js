import mongoose from "mongoose";
import { server } from "./app.js";
import { PORT, IP_SERVER, DB_USER, DB_PASSWORD, DB_HOST } from "./constants.js";
import { Server } from "socket.io";
import moment from "moment-timezone";
import { ChatMessage } from "./models/index.js"; // Ajusta a tu ruta real

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
        console.log(" NUEVO USUARIO CONECTADO");

        socket.on("disconnect", () => {
            console.log(" USUARIO DESCONECTADO");
        });

        socket.on("subscribe", (room) => {
            socket.join(room);
            console.log(` Usuario se unió al chat ${room}`);
        });

        socket.on("unsubscribe", (room) => {
            socket.leave(room);
            console.log(` Usuario salió del chat ${room}`);
        });

        // Aquí escuchamos el envío de mensajes
        socket.on("send_message", async (data) => {
            try {
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
        
                console.log("📡 Enviando mensaje a la sala:", chat_id, "tipo:", type);
                io.to(chat_id).emit("message", populated); 
                console.log("✅ Mensaje emitido a", chat_id);   
               
            } catch (error) {
                console.error("❌ Error al enviar mensaje:", error);
            }
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