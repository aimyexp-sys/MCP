# 💼 Job Portal REST API Server

A high-performance Node.js & Express REST API server pre-loaded with **100 realistic tech job vacancy records** categorized across modern engineering tech stacks (**MERN**, **MEAN**, **Python/Django**, **Android**, **iOS**, **Cloud/DevOps**, **AI/ML**, and more).

---

## 📌 Features

- **100 Full Tech Job Postings**: Comprehensive, production-grade schema for 100 vacancies.
- **Categorized by Modern Tech Stacks**:
  - **MERN** (MongoDB, Express, React, Node.js) - 22 vacancies
  - **MEAN** (MongoDB, Express, Angular, Node.js) - 18 vacancies
  - **Python/Django** (Django, Celery, DRF, PostgreSQL) - 22 vacancies
  - **Android** (Kotlin, Jetpack Compose, MVVM) - 15 vacancies
  - **iOS** (Swift, SwiftUI, Combine) - 15 vacancies
  - **DevOps / Cloud** (AWS, Kubernetes, Terraform) - 3 vacancies
  - **AI / ML & Data** (PyTorch, LangChain, Spark) - 3 vacancies
  - **Java / Spring Boot** & **Flutter / Cross-Platform** - 2 vacancies
- **Complete In One Request**: `GET /api/jobs` returns all 100 records in a single payload.
- **Search & Filter Capabilities**: Filter by stack (`?category=MERN`), keyword (`?search=react`), job type (`?jobType=Remote`), or experience level (`?experienceLevel=Senior`).
- **RESTful Endpoints**: Full CRUD endpoints for individual jobs and category aggregations.

---

## 📋 Data Schema for Each Job Record

Every record contains complete company, contact, JD, and skill set specifications:

```json
{
  "id": "JOB-001",
  "title": "Senior Full Stack MERN Developer",
  "category": "MERN",
  "techStack": "MERN",
  "company": {
    "name": "Apex Financial Systems",
    "industry": "FinTech & Payments",
    "contact": {
      "email": "careers@apexfin.com",
      "phone": "+1 (212) 555-0198",
      "website": "https://apexfin.com",
      "address": "New York, NY",
      "hrContactPerson": "David Ross (Lead Tech Recruiter)"
    }
  },
  "description": "Join our core engineering team to build scalable full-stack web applications using the MERN stack. You will architect robust RESTful microservices, optimize MongoDB query pipelines, and develop high-performance React frontends with TypeScript.",
  "requirements": {
    "experienceLevel": "Senior",
    "experienceYears": "5-8 years",
    "requiredSkills": [
      "MongoDB",
      "Express.js",
      "React.js",
      "Node.js",
      "TypeScript",
      "Redux Toolkit",
      "REST APIs",
      "Docker"
    ],
    "education": "Bachelor's degree in Computer Science, Software Engineering, or equivalent practical experience",
    "preferredQualifications": [
      "Demonstrated ability to write clean, maintainable, and test-driven code",
      "Strong communication and cross-functional team collaboration skills",
      "Experience with automated CI/CD pipelines and agile development workflows"
    ]
  },
  "jobType": "Full-Time",
  "location": "New York, NY",
  "salary": "$105,000 - $135,000 / year",
  "postedDate": "2026-09-02",
  "applicationDeadline": "2026-10-24",
  "status": "Active"
}
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v16+ or newer)
- npm (v8+ or newer)

### 2. Installation
Navigate into the `job-portal-server` directory and install dependencies:

```bash
cd job-portal-server
npm install
```

### 3. Run the Server
- **Standard Mode**:
  ```bash
  npm start
  ```
- **Development Mode** (with auto-restart):
  ```bash
  npm run dev
  ```

By default, the server runs on port **4000**:
`http://localhost:4000`

To use a custom port, pass the `PORT` environment variable:
```bash
PORT=5000 npm start
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check, API directory & supported tech stacks |
| `GET` | `/api/jobs` | **Fetch all 100 job vacancies in a single request** |
| `GET` | `/api/jobs?category=MERN` | Filter by tech stack (`MERN`, `MEAN`, `Python/Django`, `Android`, `iOS`) |
| `GET` | `/api/jobs?search=react` | Text search across title, company, skills & description |
| `GET` | `/api/jobs?jobType=Remote` | Filter by job type (`Full-Time`, `Remote`, `Hybrid`, `Contract`) |
| `GET` | `/api/jobs?experienceLevel=Senior` | Filter by experience level (`Entry-Level`, `Mid-Level`, `Senior`, `Lead / Staff`) |
| `GET` | `/api/jobs/categories` | Summary distribution and skill tags across tech categories |
| `GET` | `/api/jobs/category/:name` | Fetch all jobs for a specific tech category |
| `GET` | `/api/jobs/:id` | Fetch detailed record for a single job (e.g. `JOB-001`) |
| `POST` | `/api/jobs` | Create a new job vacancy |
| `DELETE` | `/api/jobs/:id` | Delete a job vacancy by ID |

---

## 🧪 Testing with cURL

### 1. Fetch all 100 jobs in one request:
```bash
curl http://localhost:4000/api/jobs
```

### 2. Filter jobs by Tech Stack:
```bash
# Get all MERN stack jobs
curl "http://localhost:4000/api/jobs?category=MERN"

# Get all Python/Django jobs
curl "http://localhost:4000/api/jobs?category=Python/Django"

# Get all Android jobs
curl "http://localhost:4000/api/jobs?category=Android"

# Get all iOS jobs
curl "http://localhost:4000/api/jobs?category=iOS"
```

### 3. Search jobs:
```bash
curl "http://localhost:4000/api/jobs?search=TypeScript"
```

### 4. Fetch single job by ID:
```bash
curl http://localhost:4000/api/jobs/JOB-015
```

### 5. View tech stack summary breakdown:
```bash
curl http://localhost:4000/api/jobs/categories
```
