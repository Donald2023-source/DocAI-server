# DocAI-Server — Authentication & Core Backend API

The Express.js backend service powering authentication and core APIs for the **DocAI** platform.

---

##  Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Folder Structure](#folder-structure)
3. [Environment Setup](#environment-setup)
4. [REST API Documentation](#rest-api-documentation)
5. [JWT Authentication Middleware](#jwt-authentication-middleware)
6. [Team Integration Notes](#team-integration-notes)
7. [Testing the Endpoints](#testing-the-endpoints)

---

## Architecture Overview

Built with **Express 5**, **JSON Web Tokens (JWT)**, and standard Node.js ES Modules (`"type": "module"`).

* **Database Agnostic**: Auth endpoints and JWT signing operate independently of database drivers. This leaves database connection and Mongoose model setup cleanly separated for the designated database contributor.
* **CORS Configured**: Pre-configured with Cross-Origin Resource Sharing headers to seamlessly communicate with the frontend client (`http://localhost:5173`).
* **OAuth 2.0 Ready**: Native Google and GitHub OAuth token exchange handlers included.

---

## Folder Structure

```
DocAI-Server/
├── middleware/
│   └── authMiddleware.js     # Reusable JWT Bearer protection middleware
├── routes/
│   └── auth.js               # Auth routes (register, login, me, Google/GitHub OAuth)
├── .env.example              # Environment variables template
├── app.js                    # Express application entry point & CORS configuration
├── AUTH.md                   # Live OAuth activation guide
├── package.json              # Dependencies and run scripts
└── README.md                 # Backend documentation
```

---

## Environment Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

   ariables in `.env`:
   ```env
   PORT=3000
   JWT_SECRET=docai_jwt_dev_secret_key_2026
   FRONTEND_URL=http://localhost:5173
   BACKEND_URL=http://localhost:3000

   # Optional: Live Google OAuth credentials
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=

   # Optional: Live GitHub OAuth credentials
   GITHUB_CLIENT_ID=
   GITHUB_CLIENT_SECRET=
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   *(Server starts with `nodemon` on `http://localhost:3000`)*

---

## REST API Documentation

### 1. User Registration
* **Endpoint**: `POST /api/auth/register`
* **Headers**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "name": "Alex Morgan",
    "email": "alex@docai.com",
    "password": "Password123!"
  }
  ```
* **Success Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "Account created successfully.",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr_abc123",
      "name": "Alex Morgan",
      "email": "alex@docai.com",
      "role": "user",
      "createdAt": "2026-11-21T14:00:00.000Z"
    }
  }
  ```
* **Error Response (`409 Conflict`)**:
  ```json
  {
    "success": false,
    "message": "An account with this email address already exists."
  }
  ```

---

### 2. User Login
* **Endpoint**: `POST /api/auth/login`
* **Headers**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "email": "demo@docai.com",
    "password": "Password123!"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Login successful.",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr_demo_1",
      "name": "DocAI Demo User",
      "email": "demo@docai.com",
      "role": "user"
    }
  }
  ```

---

### 3. Get Current User Profile (Protected)
* **Endpoint**: `GET /api/auth/me`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "usr_demo_1",
      "email": "demo@docai.com",
      "name": "DocAI Demo User",
      "role": "user"
    }
  }
  ```
* **Error Response (`401 Unauthorized`)**:
  ```json
  {
    "success": false,
    "message": "Access denied. No authentication token provided."
  }
  ```


### 5. Health Check
* **Endpoint**: `GET /api/health`
* **Success Response (`200 OK`)**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-11-21T14:00:00.000Z"
  }
  ```

---

## JWT Authentication Middleware

To protect any future routes created by teammates, import the [`protect`](file:///home/nikola/Documents/docAI/DocAI-Server/middleware/authMiddleware.js) middleware:

```javascript
import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// Route accessible only with valid JWT
router.get("/my-documents", protect, (req, res) => {
  // req.user contains { id, email, name, role }
  res.json({ user: req.user, documents: [] });
});

export default router;
```

---

## Team Integration Notes

* **Database Contributor**: This authentication service does not enforce or hard-code any database connections or conflicting schemas. When the database contributor connects MongoDB or provides models, they can integrate their connection cleanly in `app.js` without merge conflicts.
* **Frontend Contributor**: The server handles CORS for `localhost:5173`. When calling API routes from the frontend, use `http://localhost:3000/api/auth/...`.

---

## Testing the Endpoints

### Using cURL:

```bash
# Test Registration:
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alex","email":"alex@test.com","password":"Password123!"}'

# Test Login:
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@docai.com","password":"Password123!"}'
```
