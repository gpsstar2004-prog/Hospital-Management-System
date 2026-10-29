
require("dotenv").config();

const bcrypt = require("bcryptjs");
const prisma = require("./lib/prisma");

async function main() {
    const email = "admin@example.com";
    const password = "AdminPass123";

    const role = await prisma.role.findUnique({
        where: { roleName: "ADMIN" }
    });

    if (!role) {
        throw new Error("ADMIN role not found");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const existingUser = await prisma.user.findUnique({
        where: { email }
    });

    if (existingUser) {
        console.log("This email already exists. No changes made.");
        return;
    }

    const user = await prisma.user.create({
        data: {
            fullName: "Hospital Administrator",
            email,
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

    console.log("Admin created successfully:");
    console.log(user);
}

main()
    .catch(error => {
        console.error("Admin creation failed:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
