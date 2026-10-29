
const express = require("express");
const prisma = require("../lib/prisma");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.post(
    "/",
    authenticateToken,
    authorizeRoles("ADMIN"),
    async (req, res) => {
        try {
            const { medicineName, unitPrice, stockQty } = req.body;

            if (
                typeof medicineName !== "string" ||
                !medicineName.trim() ||
                unitPrice === undefined ||
                !Number.isFinite(Number(unitPrice)) ||
                Number(unitPrice) < 0 ||
                stockQty === undefined ||
                !Number.isInteger(Number(stockQty)) ||
                Number(stockQty) < 0
            ) {
                return res.status(400).json({
                    message: "Valid medicineName, unitPrice and stockQty are required"
                });
            }

            const medicine = await prisma.medicine.create({
                data: {
                    medicineName: medicineName.trim(),
                    unitPrice: Number(unitPrice),
                    stockQty: Number(stockQty)
                }
            });

            return res.status(201).json({
                message: "Medicine added successfully",
                medicine
            });
        } catch (error) {
            console.error("Add medicine error:", error);
            return res.status(500).json({
                message: "Unable to add medicine"
            });
        }
    }
);

router.get(
    "/",
    authenticateToken,
    authorizeRoles("ADMIN", "DOCTOR", "RECEPTIONIST"),
    async (req, res) => {
        try {
            const medicines = await prisma.medicine.findMany({
                orderBy: { medicineName: "asc" }
            });

            return res.json(medicines);
        } catch (error) {
            console.error("Fetch medicines error:", error);
            return res.status(500).json({
                message: "Unable to fetch medicines"
            });
        }
    }
);

router.get(
    "/:medicineId",
    authenticateToken,
    authorizeRoles("ADMIN", "DOCTOR", "RECEPTIONIST"),
    async (req, res) => {
        try {
            const medicineId = Number(req.params.medicineId);

            if (!Number.isInteger(medicineId) || medicineId <= 0) {
                return res.status(400).json({
                    message: "Invalid medicine ID"
                });
            }

            const medicine = await prisma.medicine.findUnique({
                where: { medicineId }
            });

            if (!medicine) {
                return res.status(404).json({
                    message: "Medicine not found"
                });
            }

            return res.json(medicine);
        } catch (error) {
            console.error("Fetch medicine error:", error);
            return res.status(500).json({
                message: "Unable to fetch medicine"
            });
        }
    }
);

module.exports = router;
