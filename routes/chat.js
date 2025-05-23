import express from "express";
import {ChatController} from "../Controllers/index.js"
import { mdAuth } from "../middlewares/authenticated.js";

const api = express.Router();

api.post("/chat", [mdAuth.asureAuth], ChatController.create);
api.get("/chat", [mdAuth.asureAuth], ChatController.getAll);
api.delete("/chat/:id", [mdAuth.asureAuth], ChatController.deleteChat);
api.get("/chat/:id", [mdAuth.asureAuth], ChatController.getChat);
api.get("/chats/without-chat", [mdAuth.asureAuth], ChatController.getUsersWithoutChat);
api.get("/chats/:id", [mdAuth.asureAuth], ChatController.getChatsFiltered);





export const ChaRoutes = api;