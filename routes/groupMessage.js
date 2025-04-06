import express from "express";
import { GroupMessageController } from "../Controllers/index.js";
import { mdAuth } from "../middlewares/authenticated.js";

const api = express.Router();

api.post("/group-message", [mdAuth.asureAuth], GroupMessageController.sendGroupMessage);
api.post("/group-message/file", [mdAuth.asureAuth], GroupMessageController.sendGroupFile);
api.get("/group-message/:groupId", [mdAuth.asureAuth], GroupMessageController.getGroupMessages);
api.get("/group-message/:groupId/count", [mdAuth.asureAuth], GroupMessageController.countGroupMessages);
api.get("/group-message/:groupId/last", [mdAuth.asureAuth], GroupMessageController.lastGroupMessage);
api.delete("/group/message/:id", [mdAuth.asureAuth], GroupMessageController.deleteGroupMessage);


export const GroupMessageRoutes = api;