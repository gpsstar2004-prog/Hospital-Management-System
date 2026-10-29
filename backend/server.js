
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const prisma = require("./lib/prisma");

const authRoutes = require("./routes/auth");
const auditLogRoutes = require("./routes/auditLogs");
const medicalRecordRoutes = require("./routes/medicalRecords");
const medicineRoutes = require("./routes/medicines");
const patientRoutes = require("./routes/patients");
const prescriptionRoutes = require("./routes/prescriptions");
const appointmentRoutes = require("./routes/appointments");
const billRoutes = require("./routes/bills");
const doctorRoutes = require("./routes/doctors");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/medical-records", medicalRecordRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "Hospital Management System API is running"
    });
});

app.get("/api/health", async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;

        res.json({
            status: "OK",
            database: "Connected"
        });
    } catch (error) {
        console.error("Health check error:", error);

        res.status(500).json({
            status: "Error",
            database: "Disconnected"
        });
    }
});

app.get("/api/appointments-test", (req, res) => {
    res.json({
        message: "Appointment routing works"
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/doctors", doctorRoutes);

app.use((req, res) => {
    res.status(404).json({
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("Server listening:", server.listening);
});

server.on("error", (error) => {
    console.error("Server startup error:", error);
});

process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (error) => {
    console.error("Unhandled rejection:", error);
});
