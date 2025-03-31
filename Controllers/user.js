import { response } from "express";
import {User} from "../models/index.js";
import {getFilePath} from "../utils/index.js";
import { log } from "console";

async function getMe(req, res){
    console.log(req.user);

    const {user_id} = req.user;

    const response = await User.findById(user_id).select(["-password"]);

    try{
        if(!response) {
            res.status(400).send({msg: "No se ha encontrado el usuario"});
        }
    
        res.status(200).send(response);
    }catch (error){
        res.status(500).send({msg: "Error del servidor"});
    }
  
}

async function getUsers(req, res){

    try{
        const {user_id} = req.user;
        const userInfo = await User.find({_id:{$ne: user_id}}).select(["-password"])
        if(!userInfo){
            res.status(400).send({msg:"No se ha encontrado el usuario"});
        }else{
            res.status(200).send(userInfo);
        }
    
    }catch(error){
        res.status(500).send({msg: "Error del servidor"});
    }
    
}

async function getUser(req, res){
  
    const {id} = req.params;

    try{
        const response = await User.findById(id).select(["-password"]);

        if(!response){
            res.status(400).send({msg: "No se ha encontado el usuario"});
        }else{
            res.status(200).send(response);
        }

    }catch(error){
        res.status(500).send({msg: "Error del servidor"})
    }

}

async function updateUser(req, res) {
    const { user_id } = req.user;
    const userData = req.body;

    if (req.files?.avatar) { // Usa optional chaining (?) para evitar errores si no hay avatar
        const imagePath = getFilePath(req.files.avatar);
        userData.avatar = imagePath;
    }

    try {
        const response = await User.findByIdAndUpdate(
            { _id: user_id },
            userData,
            { new: true, runValidators: true }
        ).lean();

        if (!response) {
            return res.status(400).send({ msg: "Error al actualizar el usuario" });
        }

        // 🔹 Devuelve solo los campos actualizados
        const updatedData = {};
        Object.keys(userData).forEach((key) => {
            updatedData[key] = response[key];
        });

        res.status(200).send(updatedData);
    } catch (error) {
        console.log(error);
        res.status(500).send({ msg: "Error del servidor", error });
    }
}


export const UserController = {
    getMe,
    getUsers,
    getUser,
    updateUser,

};