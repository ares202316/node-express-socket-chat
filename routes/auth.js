import express from "express";
import {AuthController} from "../Controllers/index.js";
//import {mdAuth} from "../middlewares/index.js";

const api = express.Router();

//Todos los endpoint
   

api.post("/auth/register", AuthController.register);
api.post("/auth/login", AuthController.login);
api.post("/auth/refresh_access_token",AuthController.refreshAccessToken );
api.post("/auth/forgot_password", AuthController.forgotPassword);
api.post("/auth/resetPassword", AuthController.resetPassword);


/*api.get("/auth/test_md",[mdAuth.asureAuth], (req, res) => {
        console.log("Datos del usuario autenticado");
        console.log(req.user);

        console.log("#########");
        console.log("#########");
        console.log("#########");

        res.status(200).send({msg: "Todo Ok"});
});*/

export const authRoutes = api;