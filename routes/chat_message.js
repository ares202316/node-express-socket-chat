import express from "express";
import multiparty from "connect-multiparty";
import {ChatMessageController} from "../Controllers/index.js";
import { mdAuth }from "../middlewares/index.js";

const mdUpload = multiparty({uploadDir: "./uploads/imagenes"});
const api = express.Router();

api.post("/chat/message", [mdAuth.asureAuth], ChatMessageController.sendMessage);

api.post("/chat/message/image", [mdAuth.asureAuth,mdUpload], ChatMessageController.sendImage);

api.get("/chat/message/:chat_id", [mdAuth.asureAuth], ChatMessageController.getAll);

api.get("/chat/message/total/:chat_id", [mdAuth.asureAuth], ChatMessageController.getTotalMessage);

api.get("/chat/message/last/:chat_id", [mdAuth.asureAuth], ChatMessageController.getLastMessage);

api.delete("/message/:id", [mdAuth.asureAuth], ChatMessageController.deleteMessage);

export const chatMessageRoutes = api;



