
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

const router = express.Router();

router.post("/register", async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must contain at least 8 characters"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Email is already registered"
            });
        }

        const role = await prisma.role.findUnique({
            where: { roleName: "PATIENT" }
        });

        if (!role) {
            return res.status(500).json({
                message: "Patient role has not been configured"
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                fullName: fullName.trim(),
                email: normalizedEmail,
                passwordHash,
                roleId: role.roleId
            },
            select: {
                userId: true,
                fullName: true,
                email: true,
                role: {
                    select: { roleName: true }
                }
            }
        });

        return res.status(201).json({
            message: "Registration successful",
            user
        });
    } catch (error) {
        console.error("Registration error:", error);

        return res.status(500).json({
            message: "Unable to register user"
        });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() },
            include: { role: true }
        });

        if (!user || !user.isActive) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                userId: user.userId,
                role: user.role.roleName
            },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        return res.json({
            message: "Login successful",
            token,
            user: {
                userId: user.userId,
                fullName: user.fullName,
                email: user.email,
                role: user.role.roleName
            }
        });
    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            message: "Unable to log in"
        });
    }
});

module.exports = router;
