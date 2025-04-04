import express from "express";
import http from "http";
import "dotenv/config";
import cors from "cors";
import morgan from "morgan";
import bodyParser from "body-parser";
import { initSocketServer, io} from "./utils/index.js";
import {authRoutes, userRoutes, ChaRoutes, chatMessageRoutes,authImagenes} from "./routes/index.js";
import path from "path";

const app = express();
const server = http.createServer(app);
initSocketServer(server);

//Configuracion Body Parser

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

//Configuracion static carperta

app.use(express.static("uploads"));

//Configuracion de los Cors
app.use(cors());

//Configuracion logger http
app.use(morgan("dev"));

//Configuracion Rutas
app.use((req, res, next) => {
    req.io = io;
    next();
});

app.use("/api", authRoutes);
app.use("/api", userRoutes);
app.use("/api", ChaRoutes);
app.use("/api", chatMessageRoutes);
app.use("/api", authImagenes);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));



export {server};

