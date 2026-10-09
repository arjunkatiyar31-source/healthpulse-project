# HealthPulse — Online Healthcare Management System

HealthPulse is a full-stack web application that lets a clinic manage appointments, patient records and users through three role-based dashboards: **Admin**, **Doctor** and **Patient**.

- **Frontend:** React + TypeScript (Vite)
- **Backend:** Java Servlets (Jakarta Servlet 6) on Apache Tomcat 10.1, using JDBC
- **Database:** MySQL

---

## Table of Contents

1. [Features](#features)
2. [Project Structure](#project-structure)
3. [Requirements](#requirements)
4. [Setup](#setup)
5. [Running the Project](#running-the-project)
6. [Demo Accounts](#demo-accounts)
7. [API Reference](#api-reference)
8. [Troubleshooting](#troubleshooting)
9. [Known Limitations](#known-limitations)

---

## Features

**Public**
- Landing page with an interactive 3D hero (`/landing.html`)
- Role-based login and self-service sign up for Patients and Doctors. Signing up automatically creates the matching doctor or patient record.

**Admin**
- Create, search, filter, edit and delete users
- View every appointment, filter by status, reschedule or cancel
- System settings
- Analytics: user and appointment counts, confirmation rate, status breakdown

**Doctor**
- Personal schedule showing only their own appointments
- Confirm pending appointments
- Patient directory with medical records, and the ability to add new records
- View patient feedback

**Patient**
- Book an appointment with any registered doctor (starts as *Pending* until the doctor confirms)
- Track, reschedule or cancel appointments
- View medical history
- Health profile: date of birth (age is calculated), gender, blood group, height, weight (BMI is calculated), contact details, allergies, chronic conditions and emergency contact

---

## Project Structure

```
healthpulse-project/
├── README.md
├── frontend/                      React + TypeScript (Vite)
│   ├── public/
│   │   └── landing.html           Static landing page
│   ├── src/
│   │   ├── api/client.ts          All API calls and token handling
│   │   ├── components/
│   │   │   ├── Common/            Modal, StatCard, StatusBanner, ApiConfigModal
│   │   │   └── Layout/            DashboardLayout (header + sidebar)
│   │   ├── context/AuthContext.tsx
│   │   ├── pages/                 Login, AdminDashboard, DoctorDashboard, PatientDashboard
│   │   ├── types/index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
└── backend/                       Maven project, packaged as a WAR
    ├── pom.xml
    ├── schema.sql                 Database schema and seed data
    └── src/main/java/com/healthcare/backend/
        ├── servlet/               One servlet per resource
        │   ├── LoginServlet.java
        │   ├── UserServlet.java
        │   ├── AppointmentServlet.java
        │   ├── DoctorServlet.java
        │   ├── PatientRecordServlet.java
        │   ├── MedicalRecordServlet.java
        │   ├── PatientProfileServlet.java
        │   ├── FeedbackServlet.java
        │   └── SettingsServlet.java
        └── util/
            ├── DBConnection.java  JDBC connection (reads db.properties)
            └── CorsFilter.java    CORS headers for the React client
```

---

## Requirements

Install these before starting:

| Tool | Version | Notes |
|---|---|---|
| JDK | 17 or newer | `JAVA_HOME` must be set |
| Apache Maven | 3.9+ | To build the WAR |
| Apache Tomcat | **10.1.x** | Must be Tomcat 10 or newer. Tomcat 9 uses the older `javax.*` packages and will not run this project. |
| MySQL Server | 8.0+ | MySQL Workbench is handy for running the SQL script |
| Node.js | 20 or newer | Includes `npm` |
| Git | any recent version | |

Check your installs:

```bash
java -version
mvn -version
node -v
npm -v
```

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/arjunkatiyar31-source/healthpulse-project.git
cd healthpulse-project
```

### 2. Create the database

Make sure MySQL is running, then run `backend/schema.sql`. It creates the `healthpulse_web` database, all tables and some demo data.

With the command line:

```bash
mysql -u root -p < backend/schema.sql
```

Or open `backend/schema.sql` in MySQL Workbench and execute the whole script.

> The script drops and recreates its tables, so running it again resets the demo data.

**Upgrading an older database?** If your `patients` table was created before the health-profile fields were added, run this once:

```sql
USE healthpulse_web;

ALTER TABLE patients
  ADD COLUMN gender VARCHAR(20) NULL,
  ADD COLUMN blood_group VARCHAR(5) NULL,
  ADD COLUMN height_cm DECIMAL(5,1) NULL,
  ADD COLUMN weight_kg DECIMAL(5,1) NULL,
  ADD COLUMN address VARCHAR(255) NULL,
  ADD COLUMN allergies TEXT NULL,
  ADD COLUMN chronic_conditions TEXT NULL,
  ADD COLUMN emergency_contact_name VARCHAR(100) NULL,
  ADD COLUMN emergency_contact_phone VARCHAR(50) NULL;
```

### 3. Configure the backend database connection

Database credentials are **not** stored in the code. Create this file (it is listed in `.gitignore`, so it is never committed):

`backend/src/main/resources/db.properties`

```properties
db.url=jdbc:mysql://localhost:3306/healthpulse_web?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
db.user=root
db.password=YOUR_MYSQL_PASSWORD
```

Replace `YOUR_MYSQL_PASSWORD` with your own MySQL password.

### 4. Configure the frontend

```bash
cd frontend
cp .env.example .env
```

(On Windows PowerShell use `Copy-Item .env.example .env`.)

Open `.env` and point the API URL at your backend:

```env
VITE_API_BASE_URL=http://localhost:8080/healthcare-backend/api
```

The `/healthcare-backend` part comes from the WAR file name. If you rename the WAR, change it here too.

You can also change the API URL later from the settings (gear) icon next to the URL badge in the dashboard header.

---

## Running the Project

You need the **backend (Tomcat)** and the **frontend (Vite)** running at the same time, plus MySQL.

### Start the backend

**1. Build the WAR**

```bash
cd backend
mvn clean package
```

This produces `backend/target/healthcare-backend.war`. Wait for `BUILD SUCCESS`.

**2. Deploy it to Tomcat**

Copy the WAR into Tomcat's `webapps` folder:

```powershell
Copy-Item target\healthcare-backend.war "C:\path\to\apache-tomcat-10.1.x\webapps\"
```

**3. Start Tomcat**

Windows:

```powershell
cd C:\path\to\apache-tomcat-10.1.x\bin
.\startup.bat
```

macOS / Linux:

```bash
cd /path/to/apache-tomcat-10.1.x/bin
./startup.sh
```

**4. Verify**

```bash
curl http://localhost:8080/healthcare-backend/api/doctors
```

You should get a JSON list of doctors.

**Redeploying after a code change:** stop Tomcat (`shutdown.bat`), delete both `webapps/healthcare-backend.war` and the unpacked `webapps/healthcare-backend/` folder, rebuild, copy the new WAR in, and start Tomcat again. Tomcat does not always replace an already-unpacked app, so skipping the delete can leave you running old code.

### Start the frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

`--legacy-peer-deps` avoids a peer-dependency conflict between Vite and its plugins.

Open the URL printed in the terminal (normally `http://localhost:3000`):

| Page | URL |
|---|---|
| Landing page | http://localhost:3000/landing.html |
| Login / Sign up | http://localhost:3000/login |

### Stopping

- Frontend: press `Ctrl+C` in its terminal
- Backend: run `shutdown.bat` (Windows) or `./shutdown.sh` (macOS / Linux) from Tomcat's `bin` folder

---

## Demo Accounts

These are created by `schema.sql`:

| Role | Email | Password |
|---|---|---|
| Admin | admin@healthpulse.com | admin123 |
| Doctor | sarah.lee@healthpulse.com | doctor123 |
| Doctor | james.patel@healthpulse.com | doctor123 |
| Patient | john.smith@healthpulse.com | patient123 |
| Patient | emma.davis@healthpulse.com | patient123 |

You can also create new Doctor and Patient accounts from the **Sign Up** tab on the login page. They appear in the Admin dashboard straight away.

---

## API Reference

Base URL: `http://localhost:8080/healthcare-backend/api`

All request and response bodies are JSON. After login, the frontend sends `Authorization: Bearer <token>` on every request.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/login` | Log in. Returns `token`, `role`, `userId`, `name`. |
| GET | `/users` | List all users |
| POST | `/users` | Create a user (also creates the doctor / patient record) |
| PUT | `/users/{id}` | Update a user |
| DELETE | `/users/{id}` | Delete a user |
| GET | `/doctors` | List doctors |
| GET | `/appointments` | List appointments. Optional `?doctorId=` and `?patientId=` (user ids). |
| POST | `/appointments` | Book an appointment |
| PUT | `/appointments/{id}` | Update date, time, status or notes |
| DELETE | `/appointments/{id}` | Delete an appointment |
| GET | `/patients/{userId}/medical-records` | A patient's medical records |
| POST | `/medical-records` | Add a medical record |
| GET | `/patient-profile/{userId}` | Get a patient's health profile (age calculated) |
| PUT | `/patient-profile/{userId}` | Update a patient's health profile |
| GET | `/feedback` | List feedback. Optional `?doctorId=`. |
| POST | `/feedback` | Submit feedback |
| GET | `/settings` | Get system settings |
| PUT | `/settings` | Update system settings |

---

## Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| Login page says *Unable to connect to API backend* | Tomcat is not running, or `VITE_API_BASE_URL` is wrong. Check that `http://localhost:8080/healthcare-backend/api/doctors` opens in the browser. |
| `404` on an endpoint you just added | Tomcat is serving an old deployment. Delete the old WAR and the unpacked `healthcare-backend` folder, then redeploy. |
| `Access denied for user 'root'@'localhost'` | The password in `backend/src/main/resources/db.properties` does not match your MySQL password. |
| `db.properties not found on classpath` | The file is missing or in the wrong folder. It must be at `backend/src/main/resources/db.properties` before you run `mvn clean package`. |
| `Public Key Retrieval is not allowed` | Make sure `allowPublicKeyRetrieval=true` is in `db.url`. |
| `Unknown column ...` when opening the patient profile | The `patients` table is missing the health-profile columns. Run the `ALTER TABLE` block from [Setup](#2-create-the-database). |
| `Neither the JAVA_HOME nor the JRE_HOME environment variable is defined` | Set `JAVA_HOME` to your JDK folder, then open a **new** terminal. |
| `mvn` or `node` is not recognized | The tool is not on your `PATH`. Add it, then open a new terminal. |
| `npm install` fails with `ERESOLVE` | Run `npm install --legacy-peer-deps`. |
| Browser shows a CORS error | Confirm Tomcat is running and was redeployed with `CorsFilter`. The error often just means the backend is down. |

---

## Known Limitations

This is a learning project. Before using anything like it with real patient data, these need to be addressed:

- **Passwords are stored in plain text.** They should be hashed (for example with BCrypt).
- **The API does not enforce authorization.** `/auth/login` issues a token, but the other endpoints do not validate it or check the caller's role. Access control is currently applied only in the frontend.
- **Feedback submission is not tied to the logged-in patient.** New feedback is saved against a default patient record.
- **No double-booking check.** Two patients can book the same doctor at the same date and time.
- **Login tokens are kept in memory,** so they are cleared whenever Tomcat restarts.
