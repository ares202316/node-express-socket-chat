import { Group } from "../models/groups.js";
import { User } from "../models/user.js";

// Crear un grupo
async function createGroup(req, res) {
    try {
        const { name, image, participants } = req.body;
        const creator = req.user.id;

        const newGroup = new Group({
            name,
            image,
            creator,
            participants: [...participants, creator]
        });

        await newGroup.save();
        console.log(newGroup);
        res.status(201).send({ group: newGroup });
    } catch (error) {
        console.log(error);
        res.status(500).send({ msg: "Error creando grupo", error });
    }
}

// Obtener todos los grupos de un usuario
async function getGroupsByUser(req, res) {
    try {
        const userId = req.user.user_id; // <-- Cambiado aquí

        const groups = await Group.find({ participants: userId }).populate("creator participants");

        res.status(200).send({ groups });
    } catch (error) {
        res.status(500).send({ msg: "Error obteniendo grupos", error });
    }
}

// Obtener detalles de un grupo
 async function getGroupById(req, res) {
    try {
        const groupId = req.params.id;

        const group = await Group.findById(groupId).populate("creator participants");
        if (!group) return res.status(404).send({ msg: "Grupo no encontrado" });

        res.status(200).send({ group });
    } catch (error) {
        res.status(500).send({ msg: "Error al buscar grupo", error });
    }
}

// Actualizar grupo
 async function updateGroup(req, res) {
    try {
        const groupId = req.params.id;
        const updateData = req.body;

        const updated = await Group.findByIdAndUpdate(groupId, updateData, { new: true });
        res.status(200).send({ group: updated });
    } catch (error) {
        res.status(500).send({ msg: "Error al actualizar grupo", error });
    }
}

// Salir de un grupo
async function leaveGroup(req, res) {
    try {
        const groupId = req.params.id;
        const userId = req.user.id;

        const group = await Group.findByIdAndUpdate(groupId, {
            $pull: { participants: userId }
        }, { new: true });

        res.status(200).send({ group });
    } catch (error) {
        res.status(500).send({ msg: "Error al salir del grupo", error });
    }
}

// Añadir participantes
async function addParticipants(req, res) {
    try {
        const groupId = req.params.id;
        const { participants } = req.body;

        const updatedGroup = await Group.findByIdAndUpdate(groupId, {
            $addToSet: { participants: { $each: participants } }
        }, { new: true });

        res.status(200).send({ group: updatedGroup });
    } catch (error) {
        res.status(500).send({ msg: "Error al añadir participantes", error });
    }
}

// Banear participante aqui voy
async function banParticipant(req, res) {
    try {
        const groupId = req.params.id;
        const userId = req.params.userId;

        const updatedGroup = await Group.findByIdAndUpdate(groupId, {
            $pull: { participants: userId }
        }, { new: true });

        res.status(200).send({ group: updatedGroup });
    } catch (error) {
        res.status(500).send({ msg: "Error al banear usuario", error });
    }
}


// Obtener usuarios que no están en el grupo
async function getNonParticipants(req, res) {
    try {
        const groupId = req.params.id;
        const group = await Group.findById(groupId);

        const nonParticipants = await User.find({ _id: { $nin: group.participants } });
        res.status(200).send({ users: nonParticipants });
    } catch (error) {
        res.status(500).send({ msg: "Error al obtener usuarios", error });
    }
}

async function getUserGroups(req, res) {
    try {
        const userId = req.user.id;
        const groups = await Group.find({ participants: userId })
            .populate("creator", "nombre email avatar")
            .populate("participants", "nombre email avatar");

        res.status(200).send({ groups });
    } catch (error) {
        res.status(500).send({ msg: "Error al obtener grupos", error });
    }
}

async function getGroupInfo(req, res) {
    try {
        const groupId = req.params.id;

        const group = await Group.findById(groupId)
            .populate("creator", "nombre email avatar")
            .populate("participants", "nombre email avatar");

        if (!group) {
            return res.status(404).send({ msg: "Grupo no encontrado" });
        }

        res.status(200).send({ group });
    } catch (error) {
        console.error("❌ Error al obtener grupo:", error);
        res.status(500).send({ msg: "Error al obtener información del grupo" });
    }
}

async function banParticipants(req, res) {
    try {
        const groupId = req.params.id;
        const { participants } = req.body; // array de user IDs a eliminar

        if (!participants || participants.length === 0) {
            return res.status(400).send({ msg: "No se proporcionaron participantes a banear" });
        }

        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).send({ msg: "Grupo no encontrado" });
        }

        // Filtra los participantes actuales excluyendo los que se van a banear
        group.participants = group.participants.filter(
            (participantId) => !participants.includes(participantId.toString())
        );

        await group.save();

        res.status(200).send({ msg: "Participantes baneados con éxito", participants: group.participants });
    } catch (error) {
        console.error("❌ Error al banear participantes:", error);
        res.status(500).send({ msg: "Error al banear participantes del grupo" });
    }
}

export const GroupController = {
    getNonParticipants,
    banParticipant,
    addParticipants,
    leaveGroup,
    updateGroup,
    createGroup,
    getGroupsByUser,
    getGroupById,
    getUserGroups,
    getGroupInfo,
    banParticipants,
  
};