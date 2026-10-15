# exp_portal-mcp-server

A **Model Context Protocol (MCP)** server built with `@modelcontextprotocol/sdk` that integrates and exposes data from:
1. **Student Directory Portal** (100 student records with technical skills, contact information, proficiencies, and graduation details).
2. **Job Vacancies Portal** (100 job vacancy listings with technical requirements, company & HR contacts, experience levels, and compensation).

---

## 🛠️ Exposed MCP Tools

### 1. `get_students`
Retrieves student profiles from the Student Directory. Includes contact details (name, email, phone), academic timeline, and comprehensive skill matrices (stacks, sub-skills, proficiencies).

#### Input Parameters:
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `student_id` | `number` | No | - | Lookup an exact student record by numeric ID (`1-100`). |
| `search` | `string` | No | - | Keyword search matching name, email, or skill keywords. |
| `tech_stack` | `string` (enum) | No | - | Filter by primary tech stack: `"MERN"`, `"MEAN"`, `"Python"`, `"Android"`, `"iOS"`. |
| `skill` | `string` | No | - | Filter by specific sub-skill (e.g. `"React"`, `"Docker"`, `"FastAPI"`, `"Kotlin"`). |
| `proficiency`| `string` (enum) | No | - | Filter by skill level: `"Beginner"`, `"Intermediate"`, `"Advanced"`. |
| `limit` | `number` | No | `10` | Maximum records to return (1-100). |
| `offset` | `number` | No | `0` | Offset for pagination. |

#### Example Response:
```json
{
  "totalMatching": 56,
  "returnedCount": 1,
  "offset": 0,
  "limit": 1,
  "filtersApplied": {
    "tech_stack": "MERN"
  },
  "students": [
    {
      "id": 1,
      "name": "Aarav Sharma",
      "contact": {
        "email": "aarav@gmail.com",
        "mobile": "+91 9876543210"
      },
      "academics": {
        "enrolledYear": 2022,
        "graduationYear": 2026
      },
      "technicalSkills": [
        {
          "stack": "MERN",
          "label": "MERN Stack",
          "proficiencyLevel": "Advanced",
          "subSkills": [
            "MongoDB – Schema design, Aggregation, Indexing",
            "Express.js – REST API, Middleware, Authentication",
            "React.js – Hooks, Context API, Redux",
            "Node.js – Event Loop, Streams, Clustering"
          ]
        }
      ]
    }
  ]
}
```

---

### 2. `get_jobs`
Retrieves job vacancies from the Job Vacancies portal. Includes company info, HR contacts, job role descriptions, required technical skills, preferred qualifications, experience tiers, and compensation.

#### Input Parameters:
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `job_id` | `string` | No | - | Lookup a single vacancy by its ID (e.g. `"JOB-001"`). |
| `search` | `string` | No | - | Keyword search in title, company name, description, or skills. |
| `tech_stack` | `string` (enum) | No | - | Filter by tech stack: `"MERN"`, `"MEAN"`, `"Python"`, `"Android"`, `"iOS"`. |
| `experience_level` | `string` (enum) | No | - | Filter by level: `"Junior"`, `"Mid-Level"`, `"Senior"`, `"Lead"`. |
| `job_type` | `string` (enum) | No | - | Filter by arrangement: `"Full-Time"`, `"Part-Time"`, `"Contract"`, `"Remote"`, `"Hybrid"`. |
| `location` | `string` | No | - | Location filter (e.g., `"Remote"`, `"New York"`, `"San Francisco"`). |
| `limit` | `number` | No | `10` | Maximum records to return (1-100). |
| `offset` | `number` | No | `0` | Offset for pagination. |

#### Example Response:
```json
{
  "totalMatching": 10,
  "returnedCount": 1,
  "offset": 0,
  "limit": 1,
  "filtersApplied": {
    "tech_stack": "MERN",
    "experience_level": "Senior"
  },
  "jobs": [
    {
      "id": "JOB-001",
      "title": "Senior Full Stack MERN Developer",
      "category": "MERN",
      "techStack": "MERN",
      "jobType": "Full-Time",
      "location": "New York, NY",
      "salary": "$105,000 - $135,000 / year",
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
      "description": "Join our core engineering team to build scalable full-stack web applications...",
      "requirements": {
        "experienceLevel": "Senior",
        "experienceYears": "5-8 years",
        "requiredSkills": ["MongoDB", "Express.js", "React.js", "Node.js", "TypeScript", "Redux Toolkit", "REST APIs", "Docker"],
        "education": "Bachelor's degree in Computer Science or equivalent practical experience",
        "preferredQualifications": [
          "Demonstrated ability to write clean, maintainable, and test-driven code",
          "Experience with automated CI/CD pipelines"
        ]
      },
      "status": "Active"
    }
  ]
}
```

---

## 🚀 Running the Server

### 1. Test the Server and Tools (Automated Verification)
```bash
npm run test:tools
```

### 2. Run over Standard I/O (Stdio Transport)
```bash
npm start
# or: node src/index.js
```

### 3. Visual Debugging with MCP Inspector
Inspect the schemas and test tool invocations in an interactive UI:
```bash
npx @modelcontextprotocol/inspector node src/index.js
```

---

## 🔌 Connecting to LLM Clients

### Claude Desktop Configuration
Add the server entry to your `claude_desktop_config.json`:
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

### Cursor / Windsurf Configuration
Add to `.cursor/mcp.json` or MCP settings:
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
