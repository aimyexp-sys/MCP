# 🚀 MCP Fullstack Suite & AI Talent-Job Matching Platform

A fullstack multi-project workspace combining a **Student Technical Directory**, a **Tech Job Vacancies Portal**, and an intelligent **Model Context Protocol (MCP) Server** (`exp_portal-mcp-server`).

This project bridges student skill profiles with real-world career vacancies, enabling developers and Large Language Models (LLMs) such as Claude Desktop, Cursor, and Antigravity to query, analyze, and match candidate talents with corporate hiring needs via standardized AI tools.

---

## 🏛️ Architecture & Services

The platform consists of 5 dedicated services:

| Component | Directory | Technology | Port / Transport | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Student API Server** | `students-server/` | Express, Node.js | [http://localhost:3000](http://localhost:3000) | REST API serving 100 student records with skill matrices across 5 tech stacks. |
| **Student Directory Portal** | `students-portal/` | HTML5, CSS3, Vite | [http://localhost:5173](http://localhost:5173) | Interactive frontend directory for filtering students by stack, skill, and graduation year. |
| **Job Portal API Server** | `job-portal-server/` | Express, Node.js | [http://localhost:4000](http://localhost:4000) | REST API delivering 100 tech vacancies with salary, HR contacts, and requirements. |
| **Job Vacancies Web Portal**| `job-portal-web/` | React 19, Vite, Lucide | [http://localhost:5174](http://localhost:5174) | Modern web interface for browsing and applying to tech jobs with filters. |
| **MCP Server (`exp_portal-mcp-server`)** | `mcp-server/` | `@modelcontextprotocol/sdk`, Zod | `stdio` (IPC) | Exposes `get_students` and `get_jobs` MCP tools for AI assistants. |

```
                              ┌─────────────────────────────┐
                              │    AI Assistant / Host      │
                              │ (Claude / Cursor / Windsurf)│
                              └──────────────┬──────────────┘
                                             │ (MCP over stdio)
                                             ▼
                              ┌─────────────────────────────┐
                              │    exp_portal-mcp-server    │
                              └──────┬───────────────┬──────┘
                                     │               │
        ┌────────────────────────────┘               └────────────────────────────┐
        ▼                                                                         ▼
┌───────────────────────────────┐                                 ┌───────────────────────────────┐
│     students-server (:3000)   │                                 │   job-portal-server (:4000)   │
│   (REST API + students.json)  │                                 │    (REST API + jobs.js)       │
└───────────────▲───────────────┘                                 └───────────────▲───────────────┘
                │                                                                 │
┌───────────────┴───────────────┐                                 ┌───────────────┴───────────────┐
│    students-portal (:5173)    │                                 │     job-portal-web (:5174)    │
│      (Vite Web Directory)     │                                 │     (Vite + React 19 Web UI)  │
└───────────────────────────────┘                                 └───────────────────────────────┘
```

---

## ⚡ Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

---

## 🛠️ Installation

Clone the repository and install dependencies:

```bash
# From workspace root:
npm install

# Install dependencies for all sub-projects:
npm install --prefix students-server
npm install --prefix students-portal
npm install --prefix job-portal-server
npm install --prefix job-portal-web
npm install --prefix mcp-server
```

---

## 🚦 How to Run Locally

### Option 1: Start All Services Together (Recommended)

From the root directory:

```bash
npm start
```

This runs all servers concurrently in a single terminal with color-coded tags:
- `[STUDENT-API]` -> [http://localhost:3000](http://localhost:3000)
- `[STUDENT-WEB]` -> [http://localhost:5173](http://localhost:5173)
- `[JOB-API]`     -> [http://localhost:4000](http://localhost:4000)
- `[JOB-WEB]`     -> [http://localhost:5174](http://localhost:5174)

Pressing `Ctrl+C` cleanly terminates all processes simultaneously.

### Option 2: Using the Shell Script

```bash
chmod +x start-all.sh
./start-all.sh
```

### Option 3: Run Sub-Projects Individually

If you want to start individual components:

```bash
# Student API (port 3000)
npm start --prefix students-server

# Student Frontend (port 5173)
npm run dev --prefix students-portal

# Job Portal API (port 4000)
npm start --prefix job-portal-server

# Job Portal Frontend (port 5174)
npm run dev --prefix job-portal-web

# MCP Server
npm start --prefix mcp-server
```

---

## 🧠 Model Context Protocol (`exp_portal-mcp-server`)

The MCP server allows LLMs to query live student profiles and corporate vacancies. It automatically synchronizes with active REST APIs (`localhost:3000` & `localhost:4000`) and falls back to persistent local storage when offline.

### Exposed Tools

#### 1. `get_students`
Retrieves student profiles from the Student Directory, including contact details, academic timeline, tech stacks (MERN, MEAN, Python, Android, iOS), sub-skills, and proficiency levels.

* **Parameters**:
  - `student_id` *(number, optional)*: Fetch an exact student by ID (1-100).
  - `search` *(string, optional)*: Match by student name, email, or skill keywords.
  - `tech_stack` *(string, optional)*: Filter by `"MERN" | "MEAN" | "Python" | "Android" | "iOS"`.
  - `skill` *(string, optional)*: Filter by sub-skill (e.g. `"React"`, `"Docker"`, `"FastAPI"`).
  - `proficiency` *(string, optional)*: Filter by `"Beginner" | "Intermediate" | "Advanced"`.
  - `limit` *(number, optional, default: 10)*: Number of records to return.
  - `offset` *(number, optional, default: 0)*: Pagination offset.

#### 2. `get_jobs`
Retrieves company vacancies from the Job Portal, including descriptions, required & preferred technical skills, experience requirements, compensation, and recruiter contact info.

* **Parameters**:
  - `job_id` *(string, optional)*: Lookup vacancy by ID (e.g. `"JOB-001"`).
  - `search` *(string, optional)*: Keyword search across title, company, description, or skills.
  - `tech_stack` *(string, optional)*: Filter by `"MERN" | "MEAN" | "Python" | "Android" | "iOS"`.
  - `experience_level` *(string, optional)*: Filter by `"Junior" | "Mid-Level" | "Senior" | "Lead"`.
  - `job_type` *(string, optional)*: Filter by `"Full-Time" | "Part-Time" | "Contract" | "Remote" | "Hybrid"`.
  - `location` *(string, optional)*: Filter by city or arrangement.
  - `limit` *(number, optional, default: 10)*: Number of records to return.
  - `offset` *(number, optional, default: 0)*: Pagination offset.

---

### 🧪 Testing the MCP Tools

Run the automated test suite from the root folder:

```bash
npm run test:mcp
```

### 🔍 Interactive Debugging with MCP Inspector

Test tool calls visually in your web browser:

```bash
npx @modelcontextprotocol/inspector node mcp-server/src/index.js
```

---

## 🔌 Connecting to AI Clients

### Claude Desktop
Add to your `claude_desktop_config.json`:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "exp_portal-mcp-server": {
      "command": "node",
      "args": [
        "/Volumes/MacDrive/MyExp/AntiGravity/MCP/mcp-server/src/index.js"
      ]
    }
  }
}
```

### Cursor / Windsurf
Add to your `.cursor/mcp.json` or MCP settings:

```json
{
  "mcpServers": {
    "exp_portal-mcp-server": {
      "command": "node",
      "args": [
        "/Volumes/MacDrive/MyExp/AntiGravity/MCP/mcp-server/src/index.js"
      ]
    }
  }
}
```

---

## 📂 Repository Layout

```text
MCP/
├── .gitignore                  # Workspace-wide git ignore rules
├── package.json                # Root scripts (start, dev, test:mcp)
├── start-all.sh                # Executable script to run all 5 services
├── README.md                   # Project overview and local execution guide
│
├── students-server/            # Student API backend (Port 3000)
│   ├── .gitignore
│   ├── package.json
│   ├── server.js
│   ├── data/                   # students.json & schema definitions
│   └── routes/                 # /api/students & /api/stats
│
├── students-portal/            # Student Frontend (Port 5173)
│   ├── .gitignore
│   ├── package.json
│   ├── index.html
│   └── src/                    # main.js, style.css
│   └── render.yaml             # Render Blueprint deployment specification
│
├── job-portal-server/          # Job Portal backend (Port 4000)
│   ├── .gitignore
│   ├── package.json
│   ├── server.js
│   ├── data/                   # 100 job vacancy listings
│   └── routes/                 # /api/jobs
│
├── job-portal-web/             # Job Portal Frontend (Port 5174)
│   ├── .gitignore
│   ├── package.json
│   ├── vite.config.js
│   └── src/                    # React 19 UI components & styling
│
└── mcp-server/                 # Model Context Protocol Server
    ├── .gitignore
    ├── package.json            # exp_portal-mcp-server
    ├── test-mcp.js             # Automated verification test suite
    ├── README.md               # Dedicated MCP specifications
    └── src/
        ├── index.js            # Stdio transport entrypoint (local)
        ├── sse.js              # HTTP / SSE transport entrypoint (Render / Cloud)
        ├── server.js           # Tool registration
        ├── dataProvider.js     # Live sync & smart search engine
        └── tools/
            ├── studentsTool.js # get_students schema & handler
            └── jobsTool.js     # get_jobs schema & handler
```

---

## 🌐 Deploying to Render

This repository includes a ready-to-use **Render Blueprint** (`render.yaml`) that configures and deploys all 5 services automatically:

1. **`students-server`**: Web Service (`node server.js`)
2. **`students-portal`**: Static Site (`dist`)
3. **`job-portal-server`**: Web Service (`node server.js`)
4. **`job-portal-web`**: Static Site (`dist`)
5. **`exp-portal-mcp-server`**: Web Service (`npm run start:sse`)

### Method 1: Automatic Deployment via Render Blueprint (Recommended)

1. Log into your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** > **Blueprint**.
3. Connect your GitHub repository: `https://github.com/aimyexp-sys/MCP`.
4. Render will detect `render.yaml` and automatically configure all 5 services with their build commands, publish directories, and environment variables.
5. Click **Apply**. Render will build and deploy all services simultaneously.

### Method 2: Connecting Claude Desktop to Deployed Render MCP

Once deployed, your MCP server runs on HTTP / Server-Sent Events (SSE). You can connect to it remotely from anywhere:

```json
{
  "mcpServers": {
    "exp_portal-mcp-server": {
      "url": "https://exp-portal-mcp-server.onrender.com/sse"
    }
  }
}
```
*(Replace `https://exp-portal-mcp-server.onrender.com` with your actual Render service URL).*
