import express from "express";
import { GroupController } from "../Controllers/index.js";
import { mdAuth } from "../middlewares/authenticated.js";
import multiparty from "connect-multiparty";

const api = express.Router();
const mdUpload = multiparty({uploadDir: "./uploads/imagenes"});

api.post("/group/create", [mdAuth.asureAuth,mdUpload], GroupController.createGroup);
api.get("/group", [mdAuth.asureAuth], GroupController.getUserGroups);
api.get("/group/me", [mdAuth.asureAuth], GroupController.getGroupsByUser);
api.get("/group/:id", [mdAuth.asureAuth], GroupController.getGroupInfo);
api.patch("/group/:id", [mdAuth.asureAuth,mdUpload], GroupController.updateGroup);
api.post("/group/:id/leave", [mdAuth.asureAuth], GroupController.leaveGroup);
api.post("/group/:id/add", [mdAuth.asureAuth], GroupController.addParticipants);

api.post("/group/:id/ban/:userId", [mdAuth.asureAuth], GroupController.banParticipant);

api.get("/group/:id/non-members", [mdAuth.asureAuth], GroupController.getNonParticipants);

api.get("/group/info/:id/", [mdAuth.asureAuth], GroupController.getGroupById);

api.get("/group/count/:id", [mdAuth.asureAuth], GroupController.getGroupParticipantCount);


export const GroupRoutes = api;
