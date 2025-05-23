import bcrypt from "bcryptjs";
import { User } from "../models/index.js";
import { jwt } from "../utils/index.js";
import jsonwebtoken from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from 'crypto';
import moment from 'moment';
import Pusher from "pusher";

const pusher = new Pusher({
  appId: "1969942",
  key: "5287c3152bf39d243e2e",
  secret: "d52985181809e6a4b67c",
  cluster: "us2",
  useTLS: true
});

async function register(req, res) {
    try {
      const { email, password } = req.body;
  
      const salt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(password, salt);
  
      const verifyToken = crypto.randomBytes(32).toString("hex");
      const verifyExpires = moment().add(1, "day").toDate();
  
      const user = new User({
        email: email.toLowerCase(),
        password: hashPassword,
        verified: false,
        verifyToken,
        verifyExpires,
      });
  
      const userStorage = await user.save();
  
      // 🔥 Enviar correo de verificación
      await sendVerifyEmail(user.email, verifyToken);
  
      res.status(201).send({ msg: "Usuario registrado. Verifica tu correo" });
    } catch (error) {
      res.status(400).send({ msg: "Error al registrar el usuario", error });
    }
  }

  async function sendVerifyEmail(email, token) {
    const verifyLink = `https://node-express-socket-chat-production.up.railway.app/verify-account?token=${token}`;
  
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  
    const mailOptions = {
      from: `"Soporte ChatApp" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verifica tu cuenta",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
          <h2 style="text-align: center;">🚀 Verificación de cuenta</h2>
          <p>Gracias por registrarte en <strong>ChatApp</strong>.</p>
          <p>Para activar tu cuenta, hacé clic en el siguiente botón:</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${verifyLink}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
              Verificar cuenta
            </a>
          </div>
          <p>Este enlace expirará en 24 horas.</p>
        </div>
      `,
    };
  
    await transporter.sendMail(mailOptions);
  }

  async function resendVerifyEmail(req, res) {
    try {
      const { email } = req.body;
      const emailLowerCase = email.toLowerCase();
  
      const user = await User.findOne({ email: emailLowerCase });
  
      if (!user) {
        return res.status(404).send({ msg: "Usuario no encontrado" });
      }
  
      if (user.verified) {
        return res.status(400).send({ msg: "La cuenta ya está verificada" });
      }
  
      // Generar nuevo token
      const verifyToken = crypto.randomBytes(32).toString("hex");
      const verifyExpires = moment().add(1, "day").toDate();
  
      user.verifyToken = verifyToken;
      user.verifyExpires = verifyExpires;
      await user.save();
  
      await sendVerifyEmail(user.email, verifyToken);
  
      res.status(200).send({ msg: "Correo de verificación reenviado" });
    } catch (error) {
      console.error("❌ Error al reenviar verificación:", error);
      res.status(500).send({ msg: "Error del servidor" });
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

        // 💡 Verificar si está verificado
        if (!userStorage.verified) {
            return res.status(403).send({
                msg: "Debes verificar tu cuenta antes de iniciar sesión. Revisa tu correo electrónico."
            });
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

        const link = `https://node-express-socket-chat-production.up.railway.app/reset-password?token=${token}`;

        const mailOptions = {
            from: `"Soporte ChatApp" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Recuperación de contraseña",
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 10px;">
                <h2 style="color: #333; text-align: center;">🔐 Restablecimiento de contraseña</h2>
                <p style="font-size: 16px; color: #555;">
                    Hola, hemos recibido una solicitud para restablecer tu contraseña en <strong>ChatApp</strong>.
                </p>
                <p style="font-size: 16px; color: #555;">
                    Para proceder, haz clic en el siguiente botón:
                </p>
                <div style="text-align: center; margin: 20px 0;">
                    <a href="${link}" 
                    style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-size: 16px;">
                        Restablecer contraseña
                    </a>
                </div>
                <p style="font-size: 14px; color: #777;">
                    Si el botón no funciona, también puedes copiar y pegar este enlace en tu navegador:
                </p>
                <p style="word-break: break-all; font-size: 14px; color: #007bff;">
                    ${link}
                </p>
                <hr style="margin: 30px 0;">
                <p style="font-size: 13px; color: #999;">
                    Si no realizaste esta solicitud, puedes ignorar este mensaje. Este enlace expirará en <strong>15 minutos</strong> por motivos de seguridad.
                </p>
                <p style="font-size: 13px; color: #999; text-align: center;">
                    © 2025 ChatApp. Todos los derechos reservados.
                </p>
            </div>
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

        res.status(200).send({ msg: "Correo de recuperación enviado", userId: user._id  });
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
        await pusher.trigger(`recovery-${user._id}`, "password-reset-success", {
            message: "Contraseña restablecida correctamente",
          });
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
    resendVerifyEmail,
};
