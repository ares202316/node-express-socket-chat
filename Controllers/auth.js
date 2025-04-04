import bcrypt from "bcryptjs";
import { User } from "../models/index.js";
import { jwt } from "../utils/index.js";
import jsonwebtoken from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from 'crypto';
import moment from 'moment';

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


async function sendRecoveryEmail(email, token) {
    try {
        console.log("Enviando token:", token); // Verifica que el token tiene valor antes de enviarlo

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // 🔥 Corrección: Asegurar interpolación del token en el email
        const mailOptions = {
            from: `"Soporte ChatApp" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Recuperación de contraseña",
            html: `
                <h2>Solicitud de restablecimiento de contraseña</h2>
                <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
                <p>Para proceder, haz clic en el siguiente enlace:</p>
                <p><strong>Token:</strong> ${token}</p> <!--  MOSTRAR EL TOKEN EN EL EMAIL -->
                <a href="http://localhost:5000/reset-password?token=${token}">Restablecer contraseña</a>
                <p>Si no hiciste esta solicitud, ignora este mensaje.</p>
                <p>Este enlace expira en 15 minutos.</p>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log("Correo de recuperación enviado a", email);
    } catch (error) {
        console.error("Error enviando el correo:", error);
    }
}

async function forgotPassword(req, res) {
    try {
        const { email } = req.body;
        const emailLowerCase = email.toLowerCase();

        const user = await User.findOne({ email: emailLowerCase });
        if (!user) {
            return res.status(400).send({ msg: "Usuario no encontrado" });
        }

        // Generar token seguro
        const resetToken = crypto.randomBytes(32).toString("hex");
        const expireTime = moment().add(15, "minutes").toDate();

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = expireTime;
        await user.save();

        console.log("Token generado:", resetToken); // Verifica que el token se genera correctamente

        await sendRecoveryEmail(emailLowerCase, resetToken);

        res.status(200).send({ msg: "Correo de recuperación enviado" });
    } catch (error) {
        console.log(error);
        res.status(500).send({ msg: "Error del servidor", error });
    }
}

async function resetPassword(req, res) {
    try {
        const { token, newPassword } = req.body;

        // Verifica si el token es válido y si no ha expirado
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: moment().toDate() }  // Verifica si el token no ha expirado
        });

        if (!user) {
            return res.status(400).send({ msg: "Token inválido o expirado" });
        }

        // Encriptar la nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Actualizar la contraseña y limpiar los campos del token
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;  // Limpiar el token de recuperación
        user.resetPasswordExpires = undefined;  // Limpiar la expiración
        await user.save();

        // Enviar una respuesta de éxito
        res.status(200).send({ msg: "Contraseña restablecida exitosamente" });

    } catch (error) {
        res.status(500).send({ msg: "Error al restablecer la contraseña", error });
    }
}

export const AuthController = {
    register,
    login,
    refreshAccessToken,
    forgotPassword,
    resetPassword,
};
