import express from "express";
import http from "http";
import "dotenv/config";
import cors from "cors";
import morgan from "morgan";
import bodyParser from "body-parser";
import { initSocketServer} from "./utils/index.js";
import {authRoutes, userRoutes, ChaRoutes, chatMessageRoutes} from "./routes/index.js";


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

app.use("/api", authRoutes);
app.use("/api", userRoutes);
app.use("/api", ChaRoutes);
app.use("/api", chatMessageRoutes);



export {server};

