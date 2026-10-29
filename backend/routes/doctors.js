
const express = require("express");
const prisma = require("../lib/prisma");
const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/auth");

const router = express.Router();

router.get(
    "/departments",
    authenticateToken,
    authorizeRoles("ADMIN", "RECEPTIONIST", "DOCTOR"),
    async (req, res) => {
        try {
            const departments = await prisma.department.findMany({
                orderBy: { deptName: "asc" }
            });
            return res.json(departments);
        } catch (error) {
            console.error("Department list error:", error);
            return res.status(500).json({ message: "Unable to fetch departments" });
        }
    }
);

router.post(
    "/",
    authenticateToken,
    authorizeRoles("ADMIN"),
    async (req, res) => {
        try {
            const { fullName, email, password, deptId, specialization, licenseNo, consultationFee } = req.body;
            if (!fullName?.trim() || !email?.trim() || !password || !deptId || !specialization?.trim() || !licenseNo?.trim() || consultationFee === undefined || consultationFee === "") {
                return res.status(400).json({ message: "All doctor fields are required." });
            }
            if (password.length < 8) {
                return res.status(400).json({ message: "Password must contain at least 8 characters." });
            }
            const fee = Number(consultationFee);
            const departmentId = Number(deptId);
            if (!Number.isFinite(fee) || fee < 0 || !Number.isInteger(departmentId) || departmentId <= 0) {
                return res.status(400).json({ message: "Enter a valid department and consultation fee." });
            }

            const normalizedEmail = email.trim().toLowerCase();
            const normalizedLicense = licenseNo.trim();
            const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
            if (existingUser) return res.status(409).json({ message: "This email is already registered." });
            const existingLicense = await prisma.doctor.findUnique({ where: { licenseNo: normalizedLicense } });
            if (existingLicense) return res.status(409).json({ message: "This medical license number is already registered." });
            const department = await prisma.department.findUnique({ where: { deptId: departmentId } });
            if (!department) return res.status(400).json({ message: "Selected department does not exist." });
            const role = await prisma.role.findUnique({ where: { roleName: "DOCTOR" } });
            if (!role) return res.status(500).json({ message: "Doctor role has not been configured." });

            const bcrypt = require("bcryptjs");
            const passwordHash = await bcrypt.hash(password, 12);
            const doctor = await prisma.$transaction(async (tx) => {
                const user = await tx.user.create({
                    data: { fullName: fullName.trim(), email: normalizedEmail, passwordHash, roleId: role.roleId },
                    select: { userId: true, fullName: true, email: true }
                });
                return tx.doctor.create({
                    data: {
                        userId: user.userId,
                        deptId: departmentId,
                        specialization: specialization.trim(),
                        licenseNo: normalizedLicense,
                        consultationFee: fee
                    },
                    include: { user: { select: { fullName: true, email: true } }, department: true }
                });
            });
            return res.status(201).json({ message: "Doctor added successfully.", doctor });
        } catch (error) {
            console.error("Doctor creation error:", error);
            if (error.code === "P2002") return res.status(409).json({ message: "Email or license number is already registered." });
            return res.status(500).json({ message: "Unable to add doctor." });
        }
    }
);

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
