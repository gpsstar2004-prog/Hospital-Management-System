const express = require("express");
const prisma = require("../lib/prisma");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

// POST /appointments
router.post(
  "/",
  authenticateToken,
  authorizeRoles("PATIENT"),
  async (req, res) => {
    try {
      const { doctorId, apptDate, apptTime, reason } = req.body;
      const parsedDoctorId = Number(doctorId);

      if (!Number.isInteger(parsedDoctorId) || parsedDoctorId <= 0) {
        return res.status(400).json({ message: "A valid doctorId is required" });
      }

      if (typeof apptDate !== "string" || !DATE_REGEX.test(apptDate)) {
        return res.status(400).json({ message: "Date must use YYYY-MM-DD format" });
      }

      if (typeof apptTime !== "string" || !TIME_REGEX.test(apptTime)) {
        return res.status(400).json({ message: "Time must use HH:mm format" });
      }

      const parsedDate = new Date(`${apptDate}T00:00:00.000Z`);
      if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== apptDate
      ) {
        return res.status(400).json({ message: "Invalid appointment date" });
      }

      const slotDateTime = new Date(`${apptDate}T${apptTime}:00.000Z`);
      if (slotDateTime <= new Date()) {
        return res.status(400).json({ message: "Appointment must be in the future" });
      }

      const patient = await prisma.patient.findUnique({
        where: { userId: req.user.userId },
        select: { patientId: true }
      });

      if (!patient) {
        return res.status(404).json({ message: "Create your patient profile first" });
      }

      const doctor = await prisma.doctor.findUnique({
        where: { doctorId: parsedDoctorId },
        select: { doctorId: true }
      });

      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }

      const apptTimeDate = new Date(`1970-01-01T${apptTime}:00.000Z`);

      // Check slot availability
      const conflictingAppointment = await prisma.appointment.findFirst({
        where: {
          doctorId: parsedDoctorId,
          apptDate: parsedDate,
          apptTime: apptTimeDate,
          status: { not: "CANCELLED" }
        }
      });

      if (conflictingAppointment) {
        return res.status(409).json({ message: "This slot is already booked" });
      }

      const appointment = await prisma.appointment.create({
        data: {
          patientId: patient.patientId,
          doctorId: parsedDoctorId,
          apptDate: parsedDate,
          apptTime: apptTimeDate,
          status: "SCHEDULED",
          reason: typeof reason === "string" && reason.trim() ? reason.trim() : null
        }
      });

      return res.status(201).json({
        message: "Appointment booked successfully",
        appointment
      });
    } catch (error) {
      console.error("Appointment booking error:", error);
      return res.status(500).json({ message: "Unable to book appointment" });
    }
  }
);

// GET /appointments/me
router.get(
  "/me",
  authenticateToken,
  authorizeRoles("PATIENT"),
  async (req, res) => {
    try {
      const patient = await prisma.patient.findUnique({
        where: { userId: req.user.userId },
        select: { patientId: true }
      });

      if (!patient) {
        return res.status(404).json({ message: "Patient profile not found" });
      }

      const appointments = await prisma.appointment.findMany({
        where: { patientId: patient.patientId },
        include: {
          doctor: {
            include: {
              user: { select: { fullName: true, email: true } },
              department: true
            }
          }
        },
        orderBy: [{ apptDate: "desc" }, { apptTime: "desc" }]
      });

      return res.json(appointments);
    } catch (error) {
      console.error("Patient appointments error:", error);
      return res.status(500).json({ message: "Unable to fetch appointments" });
    }
  }
);

// GET /appointments
router.get(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN", "RECEPTIONIST", "DOCTOR"),
  async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
      const skip = (page - 1) * limit;

      const whereClause = {};

      // If user is DOCTOR, scope to their own appointments unless specified otherwise
      if (req.user.role === "DOCTOR") {
        const doctor = await prisma.doctor.findUnique({
          where: { userId: req.user.userId },
          select: { doctorId: true }
        });
        if (!doctor) {
          return res.status(403).json({ message: "Doctor profile not found" });
        }
        whereClause.doctorId = doctor.doctorId;
      }

      const [total, appointments] = await prisma.$transaction([
        prisma.appointment.count({ where: whereClause }),
        prisma.appointment.findMany({
          where: whereClause,
          skip,
          take: limit,
          include: {
            patient: {
              select: {
                patientId: true,
                user: { select: { fullName: true, email: true } }
              }
            },
            doctor: {
              include: {
                user: { select: { fullName: true, email: true } },
                department: true
              }
            }
          },
          orderBy: [{ apptDate: "desc" }, { apptTime: "desc" }]
        })
      ]);

      return res.json({
        data: appointments,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error("Appointment list error:", error);
      return res.status(500).json({ message: "Unable to fetch appointments" });
    }
  }
);

// PATCH /appointments/:id/cancel
router.patch(
  "/:id/cancel",
  authenticateToken,
  async (req, res) => {
    try {
      const appointmentId = Number(req.params.id);

      if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
        return res.status(400).json({ message: "Invalid appointment ID" });
      }

      const appointment = await prisma.appointment.findUnique({
        where: { appointmentId }
      });

      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      const { role, userId } = req.user;

      if (role === "PATIENT") {
        const patient = await prisma.patient.findUnique({
          where: { userId },
          select: { patientId: true }
        });

        if (!patient || patient.patientId !== appointment.patientId) {
          return res.status(403).json({ message: "You can only cancel your own appointments" });
        }
      } else if (role === "DOCTOR") {
        const doctor = await prisma.doctor.findUnique({
          where: { userId },
          select: { doctorId: true }
        });

        if (!doctor || doctor.doctorId !== appointment.doctorId) {
          return res.status(403).json({ message: "You can only cancel appointments assigned to you" });
        }
      } else if (!["ADMIN", "RECEPTIONIST"].includes(role)) {
        return res.status(403).json({ message: "Access forbidden" });
      }

      if (appointment.status !== "SCHEDULED") {
        return res.status(400).json({ message: "Only scheduled appointments can be cancelled" });
      }

      const updatedAppointment = await prisma.appointment.update({
        where: { appointmentId },
        data: { status: "CANCELLED" }
      });

      return res.json({
        message: "Appointment cancelled successfully",
        appointment: updatedAppointment
      });
    } catch (error) {
      console.error("Appointment cancellation error:", error);
      return res.status(500).json({ message: "Unable to cancel appointment" });
    }
  }
);

router.patch(
    "/:id/status",
    authenticateToken,
    authorizeRoles("ADMIN", "RECEPTIONIST", "DOCTOR"),
    async (req, res) => {
        try {
            const appointmentId = Number(req.params.id);
            const { status } = req.body;

            const allowedStatuses = [
                "SCHEDULED",
                "COMPLETED",
                "NO_SHOW",
                "CANCELLED"
            ];

            if (
                !Number.isInteger(appointmentId) ||
                appointmentId <= 0
            ) {
                return res.status(400).json({
                    message: "Invalid appointment ID"
                });
            }

            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    message: "Invalid appointment status"
                });
            }

            const appointment = await prisma.appointment.findUnique({
                where: { appointmentId }
            });

            if (!appointment) {
                return res.status(404).json({
                    message: "Appointment not found"
                });
            }

            if (appointment.status === "CANCELLED") {
                return res.status(400).json({
                    message: "Cancelled appointments cannot be updated"
                });
            }

            const updatedAppointment = await prisma.appointment.update({
                where: { appointmentId },
                data: { status }
            });

            return res.json({
                message: "Appointment status updated successfully",
                appointment: updatedAppointment
            });
        } catch (error) {
            console.error("Appointment status update error:", error);

            return res.status(500).json({
                message: "Unable to update appointment status"
            });
        }
    }
);


router.post(
    "/staff-book",
    authenticateToken,
    authorizeRoles("ADMIN", "RECEPTIONIST"),
    async (req, res) => {
        try {
            const { patientId, doctorId, apptDate, apptTime, reason } = req.body;

            const parsedPatientId = Number(patientId);
            const parsedDoctorId = Number(doctorId);

            if (!Number.isInteger(parsedPatientId) || parsedPatientId <= 0) {
                return res.status(400).json({
                    message: "A valid patientId is required"
                });
            }

            if (!Number.isInteger(parsedDoctorId) || parsedDoctorId <= 0) {
                return res.status(400).json({
                    message: "A valid doctorId is required"
                });
            }

            if (typeof apptDate !== "string" || !DATE_REGEX.test(apptDate)) {
                return res.status(400).json({
                    message: "Date must use YYYY-MM-DD format"
                });
            }

            if (typeof apptTime !== "string" || !TIME_REGEX.test(apptTime)) {
                return res.status(400).json({
                    message: "Time must use HH:mm format"
                });
            }

            const parsedDate = new Date(`${apptDate}T00:00:00.000Z`);

            if (
                Number.isNaN(parsedDate.getTime()) ||
                parsedDate.toISOString().slice(0, 10) !== apptDate
            ) {
                return res.status(400).json({
                    message: "Invalid appointment date"
                });
            }

            const slotDateTime = new Date(`${apptDate}T${apptTime}:00.000Z`);

            if (slotDateTime <= new Date()) {
                return res.status(400).json({
                    message: "Appointment must be in the future"
                });
            }

            const [patient, doctor] = await Promise.all([
                prisma.patient.findUnique({
                    where: { patientId: parsedPatientId },
                    select: { patientId: true }
                }),
                prisma.doctor.findUnique({
                    where: { doctorId: parsedDoctorId },
                    select: { doctorId: true }
                })
            ]);

            if (!patient) {
                return res.status(404).json({
                    message: "Patient not found"
                });
            }

            if (!doctor) {
                return res.status(404).json({
                    message: "Doctor not found"
                });
            }

            const apptTimeDate = new Date(
                `1970-01-01T${apptTime}:00.000Z`
            );

            const conflictingAppointment = await prisma.appointment.findFirst({
                where: {
                    doctorId: parsedDoctorId,
                    apptDate: parsedDate,
                    apptTime: apptTimeDate,
                    status: { not: "CANCELLED" }
                }
            });

            if (conflictingAppointment) {
                return res.status(409).json({
                    message: "This slot is already booked"
                });
            }

            const appointment = await prisma.appointment.create({
                data: {
                    patientId: parsedPatientId,
                    doctorId: parsedDoctorId,
                    apptDate: parsedDate,
                    apptTime: apptTimeDate,
                    status: "SCHEDULED",
                    reason: typeof reason === "string" && reason.trim()
                        ? reason.trim()
                        : null
                }
            });

            return res.status(201).json({
                message: "Appointment booked successfully",
                appointment
            });
        } catch (error) {
            console.error("Staff appointment booking error:", error);

            return res.status(500).json({
                message: "Unable to book appointment"
            });
        }
    }
);

module.exports = router;