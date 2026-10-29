
const express = require("express");
const prisma = require("../lib/prisma");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.post(
    "/",
    authenticateToken,
    authorizeRoles("ADMIN", "DOCTOR"),
    async (req, res) => {
        try {
            const { recordId, medicineId, dosage, durationDays, quantity } = req.body;

            if (
                !Number.isInteger(Number(recordId)) ||
                Number(recordId) <= 0 ||
                !Number.isInteger(Number(medicineId)) ||
                Number(medicineId) <= 0 ||
                typeof dosage !== "string" ||
                !dosage.trim() ||
                !Number.isInteger(Number(durationDays)) ||
                Number(durationDays) <= 0 ||
                !Number.isInteger(Number(quantity)) ||
                Number(quantity) <= 0
            ) {
                return res.status(400).json({
                    message: "Provide valid recordId, medicineId, dosage, durationDays and quantity"
                });
            }

            const result = await prisma.$transaction(async (tx) => {
                const record = await tx.medicalRecord.findUnique({
                    where: { recordId: Number(recordId) }
                });

                if (!record) {
                    const error = new Error("Medical record not found");
                    error.statusCode = 404;
                    throw error;
                }

                const medicine = await tx.medicine.findUnique({
                    where: { medicineId: Number(medicineId) }
                });

                if (!medicine) {
                    const error = new Error("Medicine not found");
                    error.statusCode = 404;
                    throw error;
                }

                if (medicine.stockQty < Number(quantity)) {
                    const error = new Error("Insufficient medicine stock");
                    error.statusCode = 400;
                    throw error;
                }

                const updated = await tx.medicine.updateMany({
                    where: {
                        medicineId: Number(medicineId),
                        stockQty: { gte: Number(quantity) }
                    },
                    data: {
                        stockQty: { decrement: Number(quantity) }
                    }
                });

                if (updated.count !== 1) {
                    const error = new Error("Insufficient medicine stock");
                    error.statusCode = 400;
                    throw error;
                }

                const prescription = await tx.prescription.create({
                    data: {
                        recordId: Number(recordId),
                        medicineId: Number(medicineId),
                        dosage: dosage.trim(),
                        durationDays: Number(durationDays),
                        quantity: Number(quantity)
                    },
                    include: { medicine: true }
                });

                return prescription;
            });

            return res.status(201).json({
                message: "Prescription created and medicine stock updated",
                prescription: result
            });
        } catch (error) {
            if (error.statusCode) {
                return res.status(error.statusCode).json({
                    message: error.message
                });
            }

            console.error("Create prescription error:", error);
            return res.status(500).json({
                message: "Unable to create prescription"
            });
        }
    }
);

router.get(
    "/record/:recordId",
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
                where: { recordId }
            });

            if (!record) {
                return res.status(404).json({
                    message: "Medical record not found"
                });
            }

            const prescriptions = await prisma.prescription.findMany({
                where: { recordId },
                include: { medicine: true },
                orderBy: { prescriptionId: "desc" }
            });

            return res.json(prescriptions);
        } catch (error) {
            console.error("Fetch prescriptions error:", error);
            return res.status(500).json({
                message: "Unable to fetch prescriptions"
            });
        }
    }
);

module.exports = router;
