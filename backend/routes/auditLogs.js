
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
    authorizeRoles("ADMIN"),
    async (req, res) => {
        try {
            const limit = Number(req.query.limit || 50);

            if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
                return res.status(400).json({
                    message: "Limit must be between 1 and 100"
                });
            }

            const logs = await prisma.auditLog.findMany({
                take: limit,
                include: {
                    user: {
                        select: {
                            userId: true,
                            fullName: true,
                            email: true
                        }
                    }
                },
                orderBy: {
                    loggedAt: "desc"
                }
            });

            return res.json({
                count: logs.length,
                logs
            });
        } catch (error) {
            console.error("Audit log retrieval error:", error);

            return res.status(500).json({
                message: "Unable to fetch audit logs"
            });
        }
    }
);

router.post(
    "/",
    authenticateToken,
    authorizeRoles("ADMIN"),
    async (req, res) => {
        try {
            const { action, tableName, recordId } = req.body;

            if (
                typeof action !== "string" ||
                !action.trim() ||
                typeof tableName !== "string" ||
                !tableName.trim()
            ) {
                return res.status(400).json({
                    message: "Action and tableName are required"
                });
            }

            if (
                recordId !== undefined &&
                recordId !== null &&
                (!Number.isInteger(Number(recordId)) || Number(recordId) <= 0)
            ) {
                return res.status(400).json({
                    message: "Invalid recordId"
                });
            }

            const log = await prisma.auditLog.create({
                data: {
                    userId: req.user.userId,
                    action: action.trim(),
                    tableName: tableName.trim(),
                    recordId: recordId == null ? null : Number(recordId)
                }
            });

            return res.status(201).json({
                message: "Audit log created successfully",
                log
            });
        } catch (error) {
            console.error("Audit log creation error:", error);

            return res.status(500).json({
                message: "Unable to create audit log"
            });
        }
    }
);

module.exports = router;
