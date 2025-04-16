import express from "express";
import multiparty from "connect-multiparty";
import {UserController} from "../Controllers/index.js"
import { mdAuth } from "../middlewares/index.js";

const mdUpload = multiparty({uploadDir: "./uploads/avatar"});

const api = express.Router();

api.get("/user/by-email", [mdAuth.asureAuth], UserController.getUserByEmail);
api.get("/user/me", [mdAuth.asureAuth], UserController.getMe);
api.get("/user",[mdAuth.asureAuth], UserController.getUsers);
api.get("/user/:id",[mdAuth.asureAuth], UserController.getUser);
api.patch("/user/me", [mdAuth.asureAuth, mdUpload], UserController.updateUser);

export const userRoutes = api;