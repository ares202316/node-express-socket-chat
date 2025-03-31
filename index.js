import mongoose from "mongoose";
import { server } from "./app.js"; 
import { PORT, IP_SERVER, DB_USER, DB_PASSWORD, DB_HOST } from "./constants.js";
import { Server } from "socket.io"; // Importa socket.io correctamente

const mongoDbUrl = `mongodb+srv://${DB_USER}:${DB_PASSWORD}@${DB_HOST}`;

mongoose.connect(mongoDbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log("Conectado a MongoDB");

    // Inicializa Socket.io
    const io = new Server(server, {
        cors: {
            origin: "*", // Asegura que permita conexiones desde cualquier origen (ajústalo según tus necesidades)
            methods: ["GET", "POST"]
        }
    });

    server.listen(PORT, () => {
        console.log("####################");
        console.log("###### API REST ####");
        console.log("####################");
        console.log(`http://${IP_SERVER}:${PORT}/api`);
    });

    // Manejo de conexiones con Socket.io
    io.on("connection", (socket) => {
        console.log("NUEVO USUARIO CONECTADO");

        socket.on("disconnect", () => {
            console.log("USUARIO DESCONECTADO");
        });

        socket.on("subscribe", (room) => {
            socket.join(room);
        });

        socket.on("unsubscribe", (room) => {
            socket.leave(room);
        });
    });

})
.catch((error) => {
    console.error("Error conectando a MongoDB:", error);
    process.exit(1);
});
