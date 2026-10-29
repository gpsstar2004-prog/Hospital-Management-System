
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
    authorizeRoles("ADMIN", "RECEPTIONIST", "DOCTOR"),
    async (req, res) => {
        try {
            const doctors = await prisma.doctor.findMany({
                select: {
                    doctorId: true,
                    userId: true,
                    deptId: true,
                    specialization: true,
                    licenseNo: true,
                    consultationFee: true,
                    user: {
                        select: {
                            fullName: true,
                            email: true
                        }
                    },
                    department: true
                },
                orderBy: {
                    doctorId: "desc"
                }
            });

            return res.json(doctors);
        } catch (error) {
            console.error("Doctor list error:", error);

            return res.status(500).json({
                message: "Unable to fetch doctors"
            });
        }
    }
);

router.get(
    "/:id",
    authenticateToken,
    authorizeRoles("ADMIN", "RECEPTIONIST", "DOCTOR"),
    async (req, res) => {
        try {
            const doctorId = Number(req.params.id);

            if (!Number.isInteger(doctorId) || doctorId <= 0) {
                return res.status(400).json({
                    message: "Invalid doctor ID"
                });
            }

            const doctor = await prisma.doctor.findUnique({
                where: {
                    doctorId
                },
                select: {
                    doctorId: true,
                    userId: true,
                    deptId: true,
                    specialization: true,
                    licenseNo: true,
                    consultationFee: true,
                    user: {
                        select: {
                            fullName: true,
                            email: true
                        }
                    },
                    department: true
                }
            });

            if (!doctor) {
                return res.status(404).json({
                    message: "Doctor not found"
                });
            }

            return res.json(doctor);
        } catch (error) {
            console.error("Doctor retrieval error:", error);

            return res.status(500).json({
                message: "Unable to fetch doctor"
            });
        }
    }
);

module.exports = router;
