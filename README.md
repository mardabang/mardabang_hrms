# Marda Bang HRMS

Full-stack human resource management system built with React, Spring Boot, and MySQL.

## Features

- Admin and Inputer authentication with JWT and role-based authorization
- Excel employee import with validated transactional upserts
- Employee management backed by MySQL
- Employee-linked check-in and check-out
- Monthly Admin attendance grid with manual attendance entry
- Dashboard, salary, ledger, reports, and settings screens

## Project structure

```text
hrms/
  frontend/                 React 18 + Vite
  marda-hrms-backend/       Spring Boot 3 + Java 17
```

## Requirements

- Node.js 18+
- Java 17+
- Maven 3.9+
- MySQL 8+

## Backend setup

Create a MySQL database named `marda_hrms`, then configure these environment variables when their local defaults are not suitable:

```text
DB_URL=jdbc:mysql://localhost:3306/marda_hrms
DB_USERNAME=root
DB_PASSWORD=your-password
JWT_SECRET=a-private-signing-key-of-at-least-32-characters
```

Start the API:

```powershell
cd marda-hrms-backend
mvn spring-boot:run
```

The backend runs at `http://localhost:8080`. Hibernate creates and updates the application tables. Accounts are created from the registration screen; no demo accounts are seeded.

## Frontend setup

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` requests to the backend during local development.

## Production checks

```powershell
cd frontend
npm run build

cd ../marda-hrms-backend
mvn test
```

Never commit production database passwords or JWT signing keys. Configure them through environment variables in the deployment platform.
