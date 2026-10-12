# Speed Assignment Backend

Welcome to the backend API service for **Speed Assignment**. This backend provides a clean, scalable Node.js + Express foundation configured with Prisma ORM and PostgreSQL.

---

## 🛠️ Technology Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database ORM**: Prisma ORM (PostgreSQL datasource)
- **Validation**: Zod
- **Security & Utilities**: Helmet, CORS, Morgan, dotenv
- **Development**: Nodemon

---

## 📁 Folder Structure

```text
backend/
├── src/
│   ├── config/          # Environment & app configuration
│   ├── controllers/     # Route handlers & controller logic
│   ├── middleware/      # Error handlers & custom middleware
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic & database operations
│   ├── validators/      # Zod validation schemas
│   └── server.js        # Express application entry point
│
├── prisma/
│   └── schema.prisma    # Prisma database schema definition
│
├── .env                 # Local environment variables
├── .env.example         # Template for environment variables
├── .gitignore           # Files excluded from git
├── package.json         # Dependencies & npm scripts
└── README.md            # Documentation
```

---

## 🚀 Getting Started

### 1. Install Dependencies

Navigate to the `backend` directory and install dependencies:

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

The project includes `.env` and `.env.example`. By default, it runs on port `5001`:

```env
PORT=5001
NODE_ENV=development
DATABASE_URL=""
ALLOWED_ORIGINS=http://localhost:8000,http://127.0.0.1:8000,http://localhost:3000,http://127.0.0.1:5001
```

---

## 🚦 Running the Server

### Development Mode (with hot reloading)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

---

## 📡 API Endpoints

### Health Check Endpoint

- **URL**: `http://localhost:5001/api/health`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "success": true,
    "message": "Speed Assignment API is running"
  }
```

---

## 🔮 Next Phase Roadmap

In upcoming phases, we will:
1. Configure the PostgreSQL database connection string in `DATABASE_URL`.
2. Define Prisma models (User, Service, Order, Request, College, etc.).
3. Implement route controllers, services, and validation schemas.
