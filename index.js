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
        
                if (type !== "TEXT") {
                    console.log("❌ Mensaje rechazado por no ser TEXT");
                    return;
                }
        
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
        
                io.to(chat_id).emit("message", populated);
                console.log("✅ Texto emitido a", chat_id);
            } catch (error) {
                console.error("❌ Error en send_message:", error);
            }
        });
        
    });

})
.catch((error) => {
    console.error("Error conectando a MongoDB:", error);
    process.exit(1);
});
