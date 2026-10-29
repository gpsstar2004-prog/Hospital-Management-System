
const express = require("express");
const prisma = require("../lib/prisma");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.get(
    "/",
    authenticateToken,
    authorizeRoles("ADMIN", "RECEPTIONIST", "DOCTOR"),
    async (req, res) => {
        try {
            const bills = await prisma.bill.findMany({
                include: {
                    appointment: {
                        include: {
                            patient: true,
                            doctor: {
                                include: {
                                    user: {
                                        select: {
                                            fullName: true,
                                            email: true
                                        }
                                    },
                                    department: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    billId: "desc"
                }
            });

            return res.json(bills);
        } catch (error) {
            console.error("Fetch bills list error:", error);
            return res.status(500).json({
                message: "Unable to fetch bills"
            });
        }
    }
);

router.post(
    "/",
    authenticateToken,
    authorizeRoles("ADMIN", "RECEPTIONIST"),
    async (req, res) => {
        try {
            const { appointmentId, consultationAmt } = req.body;

            if (
                !Number.isInteger(Number(appointmentId)) ||
                Number(appointmentId) <= 0 ||
                consultationAmt === undefined ||
                !Number.isFinite(Number(consultationAmt)) ||
                Number(consultationAmt) < 0
            ) {
                return res.status(400).json({
                    message: "Valid appointmentId and consultationAmt are required"
                });
            }

            const bill = await prisma.$transaction(async (tx) => {
                const appointment = await tx.appointment.findUnique({
                    where: { appointmentId: Number(appointmentId) },
                    include: {
                        medicalRecord: {
                            include: {
                                prescriptions: {
                                    include: { medicine: true }
                                }
                            }
                        }
                    }
                });

                if (!appointment) {
                    const error = new Error("Appointment not found");
                    error.statusCode = 404;
                    throw error;
                }

                const existing = await tx.bill.findUnique({
                    where: { appointmentId: Number(appointmentId) }
                });

                if (existing) {
                    const error = new Error("A bill already exists for this appointment");
                    error.statusCode = 409;
                    throw error;
                }

                const medicineAmt = appointment.medicalRecord
                    ? appointment.medicalRecord.prescriptions.reduce(
                        (sum, prescription) =>
                            sum + Number(prescription.medicine.unitPrice) * prescription.quantity,
                        0
                    )
                    : 0;

                const consultation = Number(consultationAmt);
                const totalAmt = Math.round((consultation + medicineAmt) * 100) / 100;

                return tx.bill.create({
                    data: {
                        appointmentId: Number(appointmentId),
                        consultationAmt: consultation,
                        medicineAmt,
                        totalAmt,
                        paymentStatus: "PENDING"
                    }
                });
            });

            return res.status(201).json({
                message: "Bill created successfully",
                bill
            });
        } catch (error) {
            if (error.statusCode) {
                return res.status(error.statusCode).json({
                    message: error.message
                });
            }

            console.error("Create bill error:", error);
            return res.status(500).json({
                message: "Unable to create bill"
            });
        }
    }
);

router.get(
    "/:billId",
    authenticateToken,
    authorizeRoles("ADMIN", "RECEPTIONIST", "DOCTOR"),
    async (req, res) => {
        try {
            const billId = Number(req.params.billId);

            if (!Number.isInteger(billId) || billId <= 0) {
                return res.status(400).json({
                    message: "Invalid bill ID"
                });
            }

            const bill = await prisma.bill.findUnique({
                where: { billId },
                include: {
                    appointment: {
                        include: {
                            patient: true,
                            doctor: {
                                include: {
                                    user: {
                                        select: {
                                            fullName: true,
                                            email: true
                                        }
                                    },
                                    department: true
                                }
                            }
                        }
                    }
                }
            });

            if (!bill) {
                return res.status(404).json({
                    message: "Bill not found"
                });
            }

            return res.json(bill);
        } catch (error) {
            console.error("Fetch bill error:", error);
            return res.status(500).json({
                message: "Unable to fetch bill"
            });
        }
    }
);

router.patch(
    "/:billId/payment",
    authenticateToken,
    authorizeRoles("ADMIN", "RECEPTIONIST"),
    async (req, res) => {
        try {
            const billId = Number(req.params.billId);
            const { paymentStatus } = req.body;

            if (!Number.isInteger(billId) || billId <= 0) {
                return res.status(400).json({
                    message: "Invalid bill ID"
                });
            }

            if (!["PAID", "PENDING"].includes(paymentStatus)) {
                return res.status(400).json({
                    message: "paymentStatus must be PAID or PENDING"
                });
            }

            const existing = await prisma.bill.findUnique({
                where: { billId }
            });

            if (!existing) {
                return res.status(404).json({
                    message: "Bill not found"
                });
            }

            const bill = await prisma.bill.update({
                where: { billId },
                data: {
                    paymentStatus,
                    paidOn: paymentStatus === "PAID" ? new Date() : null
                }
            });

            return res.json({
                message: "Payment status updated successfully",
                bill
            });
        } catch (error) {
            console.error("Update payment status error:", error);
            return res.status(500).json({
                message: "Unable to update payment status"
            });
        }
    }
);

module.exports = router;
