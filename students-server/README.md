# 🎓 Student API Server

A Node.js + Express REST API server with **100 dummy student records**, each containing name, email, mobile number, and tech skills categorized by stack.

---

## 📁 Project Structure

```
MCP/
├── server.js            ← Entry point
├── package.json
├── data/
│   └── students.js      ← 100 generated student records + TECH_STACKS definition
└── routes/
    ├── students.js      ← /api/students endpoints
    └── stats.js         ← /api/stats endpoint
```

---

## 🚀 Setup & Run

### 1 — Install dependencies
```bash
npm install
```

### 2 — Start server
```bash
# Production
npm start

# Development (auto-reload on file change)
npm run dev
```

Server starts at **http://localhost:3000**

---

## 📡 API Endpoints

### `GET /`
Health check – lists all available endpoints.

### `GET /api/students`
Returns all 100 students. Optional query params:
- `?stack=MERN` — filter by stack (MERN | MEAN | Python | Android | iOS)
- `?search=priya` — search by name or email
- `?page=1&limit=10` — pagination

### `GET /api/students/:id`
Returns a single student by ID (1–100).

### `GET /api/students/stack/:stackName`
Returns all students for a specific stack.

### `GET /api/stats`
Returns aggregate counts and proficiency breakdown per tech stack.

---

## 🛠️ Tech Stacks Covered

| Stack    | Sub-skills examples                                    |
|----------|--------------------------------------------------------|
| MERN     | MongoDB, Express.js, React.js, Node.js, Redux, Socket.IO |
| MEAN     | MongoDB, Express.js, Angular, Node.js, NgRx, TypeScript |
| Python   | Django REST, Flask, FastAPI, Celery, Pandas, Scikit-learn |
| Android  | Kotlin, Jetpack Compose, Room DB, Retrofit, Firebase   |
| iOS      | Swift, SwiftUI, UIKit, Combine, Core Data, Alamofire   |
