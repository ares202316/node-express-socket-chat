import express from "express";
import {AuthController} from "../Controllers/index.js";
//import {mdAuth} from "../middlewares/index.js";
import path from "path";
import { fileURLToPath } from "url";
const api = express.Router();

//Todos los endpoint
   



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

api.get("/avatar/:filename", (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, "..", "uploads", "avatar", filename);

    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(404).send({ error: "Imagen no encontrada" });
        }
    });
});

api.get("/imagenes/:filename", (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, "..", "uploads", "imagenes", filename);

    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(404).send({ error: "Archivo no encontrado" });
        }
    });
});


/*api.get("/auth/test_md",[mdAuth.asureAuth], (req, res) => {
        console.log("Datos del usuario autenticado");
        console.log(req.user);

        console.log("#########");
        console.log("#########");
        console.log("#########");

        res.status(200).send({msg: "Todo Ok"});
});*/

export const authImagenes = api;