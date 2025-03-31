import bcrypt from "bcryptjs";
import { User } from "../models/index.js";
import { jwt } from "../utils/index.js";
import jsonwebtoken from "jsonwebtoken";


async function register(req, res) {
    try {
        const { email, password } = req.body;

        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        const user = new User({
            email: email.toLowerCase(),
            password: hashPassword,
        });

        const userStorage = await user.save();
        res.status(201).send({ user: userStorage });
    } catch (error) {
        res.status(400).send({ msg: "Error al registrar el usuario", error });
    }
}

async function login(req, res) {
    try {
        const { email, password } = req.body;
        const emailLowerCase = email.toLowerCase();

        // Buscar usuario en la base de datos
        const userStorage = await User.findOne({ email: emailLowerCase });

        if (!userStorage) {
            return res.status(400).send({ msg: "Usuario no encontrado" });
        }

        // Comparar la contraseña
        const check = await bcrypt.compare(password, userStorage.password);
        if (!check) {
            return res.status(400).send({ msg: "Contraseña incorrecta" });
        }

        // Generar el token de acceso
        const accessToken = await jwt.createAccessToken(userStorage);

        const resfreshToken = await jwt.createRefreshToken(userStorage);

        res.status(200).send({
            access: accessToken,
            refresh: resfreshToken, 
        });
    } catch (error) {
        res.status(500).send({ msg: "Error del servidor", error });
    }
}



async function refreshAccessToken(req, res) {
    try {
        const { refreshToken } = req.body; // Corregido el nombre de la variable

        if (!refreshToken) {
            return res.status(400).json({ msg: "Token requerido" });
        }

        // Verificar si el token ha expirado
        const hasExpired = jwt.hasExpiredToken(refreshToken);
        if (hasExpired) {
            return res.status(400).json({ msg: "Token expirado" });
        }

        // Decodificar el token para obtener el user_id
        const decodedToken = jsonwebtoken.decode(refreshToken);
        if (!decodedToken || !decodedToken.user_id) {
            return res.status(400).json({ msg: "Token inválido" });
        }

        // Buscar usuario en la base de datos
        const userStorage = await User.findById(decodedToken.user_id);
        if (!userStorage) {
            return res.status(404).json({ msg: "Usuario no encontrado" });
        }

        // Generar un nuevo access token
        const newAccessToken = await jwt.createAccessToken(userStorage);

        console.log("Nuevo accessToken generado:", newAccessToken);
        return res.status(200).json({
            accessToken: newAccessToken,
        });
    } catch (error) {
        console.error("Error en refreshAccessToken:", error); // Mostrar el error en consola
        return res.status(500).json({ msg: "Error del servidor", error: error.message });
    }
}


export const AuthController = {
    register,
    login,
    refreshAccessToken,
};
