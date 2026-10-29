# MediCare updates

This update includes:

- Admin-only **Add Doctor** form on the Doctors page. It creates a DOCTOR login and linked doctor profile, including department, specialization, license number, and consultation fee.
- Browser Back now moves through the previously visited in-app pages and keeps the user inside the application.
- Patient **Create an account** flow on the login screen. Registration creates both the PATIENT user and the linked patient profile.

## Run the project

1. Extract this folder.
2. In `backend`, create a `.env` file based on `.env.example` and enter your own PostgreSQL connection string and a long private JWT secret. Do not share the `.env` file.
3. Install backend dependencies with `npm install`, then run your existing Prisma setup/migrations as needed and start the backend using your usual command.
4. In `frontend`, run `npm install`, then `npm run dev`.
5. Sign in as an ADMIN to use **Doctors → Add Doctor**. The database must already contain at least one department. Patient registration is available from the login page.

The delivered archive intentionally excludes `.env`, `.git`, `node_modules`, and Postman workspace files. This avoids sharing secrets and platform-specific dependencies; dependencies can be reinstalled with `npm install` in each project folder.
