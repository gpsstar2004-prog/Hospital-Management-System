
const express = require("express");
const prisma = require("../lib/prisma");
const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/auth");

const router = express.Router();

router.get(
    "/",
    authenticateToken,
    authorizeRoles("ADMIN", "DOCTOR"),
    async (req, res) => {
        try {
            const records = await prisma.medicalRecord.findMany({
                include: {
                    appointment: {
                        include: {
                            patient: {
                                include: {
                                    user: {
                                        select: {
                                            fullName: true,
                                            email: true
                                        }
                                    }
                                }
                            },
                            doctor: {
                                include: {
                                    user: {
                                        select: {
                                            fullName: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    recordId: "desc"
                }
            });

            return res.json(records);
        } catch (error) {
            console.error("Medical records list error:", error);

            return res.status(500).json({
                message: "Unable to fetch medical records"
            });
        }
    }
);

router.get(
    "/:recordId",
    authenticateToken,
    authorizeRoles("ADMIN", "DOCTOR"),
    async (req, res) => {
        try {
            const recordId = Number(req.params.recordId);

            if (!Number.isInteger(recordId) || recordId <= 0) {
                return res.status(400).json({
                    message: "Invalid medical record ID"
                });
            }

            const record = await prisma.medicalRecord.findUnique({
                where: {
                    recordId
                },
                include: {
                    appointment: {
                        include: {
                            patient: {
                                include: {
                                    user: {
                                        select: {
                                            fullName: true,
                                            email: true
                                        }
                                    }
                                }
                            },
                            doctor: {
                                include: {
                                    user: {
                                        select: {
                                            fullName: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            if (!record) {
                return res.status(404).json({
                    message: "Medical record not found"
                });
            }

            return res.json(record);
        } catch (error) {
            console.error("Medical record retrieval error:", error);

            return res.status(500).json({
                message: "Unable to fetch medical record"
            });
        }
    }
);

router.post(
    "/",
    authenticateToken,
    authorizeRoles("ADMIN", "DOCTOR"),
    async (req, res) => {
        try {
            const {
                appointmentId,
                diagnosis,
                notes
            } = req.body;

            if (
                !Number.isInteger(Number(appointmentId)) ||
                Number(appointmentId) <= 0 ||
                typeof diagnosis !== "string" ||
                !diagnosis.trim()
            ) {
                return res.status(400).json({
                    message: "Valid appointmentId and diagnosis are required"
                });
            }

            const appointment = await prisma.appointment.findUnique({
                where: {
                    appointmentId: Number(appointmentId)
                }
            });

            if (!appointment) {
                return res.status(404).json({
                    message: "Appointment not found"
                });
            }

            const existing = await prisma.medicalRecord.findUnique({
                where: {
                    appointmentId: Number(appointmentId)
                }
            });

            if (existing) {
                return res.status(409).json({
                    message: "A medical record already exists for this appointment"
                });
            }

            const record = await prisma.medicalRecord.create({
                data: {
                    appointmentId: Number(appointmentId),
                    diagnosis: diagnosis.trim(),
                    notes: notes || null
                }
            });

            return res.status(201).json({
                message: "Medical record created successfully",
                record
            });
        } catch (error) {
            console.error("Medical record creation error:", error);

            return res.status(500).json({
                message: "Unable to create medical record"
            });
        }
    }
);

module.exports = router;
