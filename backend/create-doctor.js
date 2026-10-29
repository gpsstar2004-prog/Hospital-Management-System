
require("dotenv").config();

const bcrypt = require("bcryptjs");
const prisma = require("./lib/prisma");

async function main() {
    const email = "doctor@example.com";
    const password = "DoctorPass123";

    const role = await prisma.role.findUnique({
        where: { roleName: "DOCTOR" }
    });

    if (!role) {
        throw new Error("DOCTOR role not found");
    }

    const department = await prisma.department.findUnique({
        where: { deptName: "General Medicine" }
    });

    if (!department) {
        throw new Error("Department not found");
    }

    let user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        const passwordHash = await bcrypt.hash(password, 12);

        user = await prisma.user.create({
            data: {
                fullName: "Dr. Test Doctor",
                email,
                passwordHash,
                roleId: role.roleId
            }
        });
    }

    const existingDoctor = await prisma.doctor.findUnique({
        where: { userId: user.userId }
    });

    if (!existingDoctor) {
        await prisma.doctor.create({
            data: {
                userId: user.userId,
                deptId: department.deptId,
                specialization: "General Medicine",
                licenseNo: "TEST-LIC-001",
                consultationFee: 500
            }
        });
    }

    console.log("Doctor account and profile are ready.");
    console.log("Email:", email);
    console.log("Doctor ID:", user.userId);
}

main()
    .catch(error => {
        console.error("Doctor setup failed:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
