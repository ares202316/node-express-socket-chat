import express from "express";
import http from "http";
import "dotenv/config";
import cors from "cors";
import { fileURLToPath } from "url"; 
import morgan from "morgan";
import { User } from "./models/index.js";
import bodyParser from "body-parser";
import { initSocketServer, io} from "./utils/index.js";
import {authRoutes, userRoutes, ChaRoutes, chatMessageRoutes,authImagenes,GroupRoutes,GroupMessageRoutes } from "./routes/index.js";
import path from "path";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: "1969942",
  key: "5287c3152bf39d243e2e",
  secret: "d52985181809e6a4b67c",
  cluster: "us2",
  useTLS: true
});


const app = express();
const server = http.createServer(app);
initSocketServer(server);


const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.static(path.join(__dirname, "public")));

app.get("/reset-password", (req, res) => {
    const token = req.query.token;
    res.redirect(`/reset-password.html?token=${token}`);
  });

  app.get("/verify-account", async (req, res) => {
    const { token } = req.query;
  
    try {
      const user = await User.findOne({
        verifyToken: token,
        verifyExpires: { $gt: new Date() },
      });
  
      if (!user) {
        return res.status(400).send("Token inválido o expirado.");
      }
  
      user.verified = true;
      user.verifyToken = undefined;
      user.verifyExpires = undefined;
      await user.save();
  
      // 🚀 Emitir evento a Pusher
      await pusher.trigger("verify-channel", `verified-${user.email}`, {
        message: "Cuenta verificada"
      });
  
      return res.redirect("/verify-success.html");
    } catch (err) {
      console.error("❌ Error al verificar:", err);
      res.status(500).send("Error al verificar la cuenta.");
    }
  });

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
app.use("/api", authImagenes);
app.use("/api", authImagenes);
app.use("/api", GroupRoutes);
app.use("/api", GroupMessageRoutes);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));



export {server};

