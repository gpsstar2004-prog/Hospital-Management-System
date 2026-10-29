const express = require("express");
const prisma = require("../lib/prisma");
const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/auth");

const router = express.Router();

router.post(
    "/",
    authenticateToken,
    authorizeRoles("PATIENT"),
    async (req, res) => {
        try {
            const {
                name,
                dob,
                gender,
                phone,
                bloodGroup,
                address
            } = req.body;

            if (!name || !name.trim()) {
                return res.status(400).json({
                    message: "Patient name is required"
                });
            }

            const existing = await prisma.patient.findUnique({
                where: { userId: req.user.userId }
            });

            if (existing) {
                return res.status(409).json({
                    message: "Patient profile already exists"
                });
            }

            const patient = await prisma.patient.create({
                data: {
                    userId: req.user.userId,
                    name: name.trim(),
                    dob: dob ? new Date(dob) : null,
                    gender: gender || null,
                    phone: phone || null,
                    bloodGroup: bloodGroup || null,
                    address: address || null
                }
            });

            return res.status(201).json({
                message: "Patient profile created",
                patient
            });
        } catch (error) {
            console.error("Patient creation error:", error);

            return res.status(500).json({
                message: "Unable to create patient profile"
            });
        }
    }
);

router.get(
    "/me",
    authenticateToken,
    authorizeRoles("PATIENT"),
    async (req, res) => {
        try {
            const patient = await prisma.patient.findUnique({
                where: { userId: req.user.userId },
                include: { appointments: true }
            });

            if (!patient) {
                return res.status(404).json({
                    message: "Patient profile not found"
                });
            }

            return res.json(patient);
        } catch (error) {
            console.error("Patient retrieval error:", error);

            return res.status(500).json({
                message: "Unable to fetch patient profile"
            });
        }
    }
);

router.put(
    "/me",
    authenticateToken,
    authorizeRoles("PATIENT"),
    async (req, res) => {
        try {
            const {
                name,
                dob,
                gender,
                phone,
                bloodGroup,
                address
            } = req.body;

            const existing = await prisma.patient.findUnique({
                where: { userId: req.user.userId }
            });

            if (!existing) {
                return res.status(404).json({
                    message: "Create your patient profile first"
                });
            }

            const data = {};

            if (name !== undefined) {
                if (!name.trim()) {
                    return res.status(400).json({
                        message: "Patient name cannot be empty"
                    });
                }
                data.name = name.trim();
            }

            if (dob !== undefined) {
                data.dob = dob ? new Date(dob) : null;
            }

            if (gender !== undefined) data.gender = gender;
            if (phone !== undefined) data.phone = phone;
            if (bloodGroup !== undefined) data.bloodGroup = bloodGroup;
            if (address !== undefined) data.address = address;

            const patient = await prisma.patient.update({
                where: { userId: req.user.userId },
                data
            });

            return res.json({
                message: "Patient profile updated",
                patient
            });
        } catch (error) {
            console.error("Patient update error:", error);

            return res.status(500).json({
                message: "Unable to update patient profile"
            });
        }
    }
);

router.get(
    "/",
    authenticateToken,
    authorizeRoles("ADMIN", "RECEPTIONIST", "DOCTOR"),
    async (req, res) => {
        try {
            const patients = await prisma.patient.findMany({
                select: {
                    patientId: true,
                    name: true,
                    dob: true,
                    gender: true,
                    phone: true,
                    bloodGroup: true
                },
                orderBy: { patientId: "desc" }
            });

            return res.json(patients);
        } catch (error) {
            console.error("Patient list error:", error);

            return res.status(500).json({
                message: "Unable to fetch patients"
            });
        }
    }
);

router.post(
    "/staff-create",
    authenticateToken,
    authorizeRoles("ADMIN", "RECEPTIONIST"),
    async (req, res) => {
        try {
            const {
                name,
                dob,
                gender,
                phone,
                bloodGroup,
                address
            } = req.body;

            if (typeof name !== "string" || !name.trim()) {
                return res.status(400).json({
                    message: "Patient name is required"
                });
            }

            let parsedDob = null;
            if (dob) {
                parsedDob = new Date(dob);
                if (Number.isNaN(parsedDob.getTime())) {
                    return res.status(400).json({
                        message: "Enter a valid date of birth"
                    });
                }
                if (parsedDob > new Date()) {
                    return res.status(400).json({
                        message: "Date of birth cannot be in the future"
                    });
                }
            }

            const patient = await prisma.patient.create({
                data: {
                    name: name.trim(),
                    dob: parsedDob,
                    gender: gender || null,
                    phone: phone || null,
                    bloodGroup: bloodGroup || null,
                    address: address || null
                }
            });

            return res.status(201).json({
                message: "Patient added successfully",
                patient
            });
        } catch (error) {
            console.error("Staff patient creation error:", error);

            return res.status(500).json({
                message: "Unable to add patient"
            });
        }
    }
);

module.exports = router;
