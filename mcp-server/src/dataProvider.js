import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Resolve paths to the data files in the sibling directories
const studentsDataPath = path.resolve(__dirname, "../../students-server/data/students.js");
const jobsDataPath = path.resolve(__dirname, "../../job-portal-server/data/jobs.js");

let cachedStudents = null;
let cachedTechStacks = null;
let cachedJobs = null;

const STUDENTS_API_URL = process.env.STUDENTS_API_URL || "http://localhost:3000/api/students";
const JOBS_API_URL = process.env.JOBS_API_URL || "http://localhost:4000/api/jobs";

/**
 * Load student records.
 * First tries to fetch live data from the running Student API (STUDENTS_API_URL)
 * to ensure 100% real-time synchronization with the Web Portal.
 * Falls back to the local data snapshot if the server is not active.
 */
export async function getStudentsData() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 800);
    const res = await fetch(STUDENTS_API_URL, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.data || json.students);
      if (Array.isArray(list) && list.length > 0) {
        cachedStudents = list;
        return { students: cachedStudents, techStacks: cachedTechStacks || {} };
      }
    }
  } catch (err) {
    // API server offline or not reachable, fallback to local data
  }

  if (!cachedStudents) {
    const raw = require(studentsDataPath);
    cachedStudents = raw.students || [];
    cachedTechStacks = raw.TECH_STACKS || {};
  }
  return { students: cachedStudents, techStacks: cachedTechStacks };
}

/**
 * Load job vacancies.
 * First tries to fetch live data from the running Job Portal API (JOBS_API_URL)
 * with graceful fallback to the local file.
 */
export async function getJobsData() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 800);
    const res = await fetch(JOBS_API_URL, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.data || json.jobs);
      if (Array.isArray(list) && list.length > 0) {
        cachedJobs = list;
        return cachedJobs;
      }
    }
  } catch (err) {
    // API server offline, fallback to local data
  }

  if (!cachedJobs) {
    const raw = require(jobsDataPath);
    cachedJobs = Array.isArray(raw) ? raw : (raw.jobs || []);
  }
  return cachedJobs;
}

/**
 * Filter students based on query criteria
 */
export async function queryStudents(filters = {}) {
  const { students } = await getStudentsData();
  const {
    student_id,
    search,
    tech_stack,
    skill,
    proficiency,
    limit = 10,
    offset = 0
  } = filters;

  // Single ID lookup
  if (student_id !== undefined && student_id !== null) {
    const student = students.find((s) => s.id === Number(student_id));
    return {
      totalMatching: student ? 1 : 0,
      returnedCount: student ? 1 : 0,
      offset: 0,
      limit: 1,
      filtersApplied: { student_id },
      students: student ? [formatStudent(student)] : []
    };
  }

  let results = [...students];

  // Tech stack filter (e.g. "MERN", "Python")
  if (tech_stack) {
    const targetStack = tech_stack.trim().toLowerCase();
    results = results.filter((s) =>
      s.technicalSkills?.some(
        (ts) => ts.stack?.toLowerCase() === targetStack || ts.label?.toLowerCase().includes(targetStack)
      )
    );
  }

  // Sub-skill filter (e.g. "React", "Docker", "FastAPI")
  if (skill) {
    const targetSkill = skill.trim().toLowerCase();
    results = results.filter((s) =>
      s.technicalSkills?.some((ts) =>
        ts.subSkills?.some((sub) => sub.toLowerCase().includes(targetSkill))
      )
    );
  }

  // Proficiency level filter ("Beginner", "Intermediate", "Advanced")
  if (proficiency) {
    const targetProf = proficiency.trim().toLowerCase();
    results = results.filter((s) =>
      s.technicalSkills?.some(
        (ts) => ts.proficiencyLevel?.toLowerCase() === targetProf
      )
    );
  }

  // Free-text keyword search matching full name, tokens, email, or skills
  if (search) {
    const q = search.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);

    results = results.filter((s) => {
      const name = s.name?.toLowerCase() || "";
      const email = s.email?.toLowerCase() || "";
      const skillsText = s.technicalSkills
        ?.map((ts) => `${ts.stack} ${ts.label} ${ts.subSkills?.join(" ")}`)
        .join(" ")
        .toLowerCase() || "";

      // 1. Exact substring match anywhere
      if (name.includes(q) || email.includes(q) || skillsText.includes(q)) {
        return true;
      }

      // 2. All tokens present across name, email, or skills (e.g. "Aarav Garg")
      const allTokensMatch = tokens.every(
        (t) => name.includes(t) || email.includes(t) || skillsText.includes(t)
      );
      if (allTokensMatch) return true;

      // 3. Any prominent token matches name (e.g. if searching "Aarav Garg" when only "Aarav" matches)
      const tokenMatchesName = tokens.some((t) => t.length >= 3 && name.includes(t));
      return tokenMatchesName;
    });
  }

  const totalMatching = results.length;
  const paginated = results.slice(offset, offset + limit).map(formatStudent);

  return {
    totalMatching,
    returnedCount: paginated.length,
    offset,
    limit,
    filtersApplied: {
      search: search || null,
      tech_stack: tech_stack || null,
      skill: skill || null,
      proficiency: proficiency || null
    },
    students: paginated
  };
}

/**
 * Filter job vacancies based on query criteria
 */
export async function queryJobs(filters = {}) {
  const jobs = await getJobsData();
  const {
    job_id,
    search,
    tech_stack,
    experience_level,
    job_type,
    location,
    limit = 10,
    offset = 0
  } = filters;

  // Single ID lookup (e.g. "JOB-001")
  if (job_id) {
    const cleanId = job_id.trim().toUpperCase();
    const job = jobs.find((j) => j.id?.toUpperCase() === cleanId);
    return {
      totalMatching: job ? 1 : 0,
      returnedCount: job ? 1 : 0,
      offset: 0,
      limit: 1,
      filtersApplied: { job_id },
      jobs: job ? [job] : []
    };
  }

  let results = [...jobs];

  // Tech stack filter (e.g. "MERN", "Python")
  if (tech_stack) {
    const targetStack = tech_stack.trim().toLowerCase();
    results = results.filter((j) =>
      j.techStack?.toLowerCase() === targetStack ||
      j.category?.toLowerCase() === targetStack ||
      j.title?.toLowerCase().includes(targetStack)
    );
  }

  // Experience level filter ("Junior", "Mid-Level", "Senior", "Lead")
  if (experience_level) {
    const targetExp = experience_level.trim().toLowerCase();
    results = results.filter((j) => {
      const exp = j.requirements?.experienceLevel?.toLowerCase() || "";
      if (targetExp === "junior") return exp.includes("junior") || exp.includes("entry");
      if (targetExp === "mid-level") return exp.includes("mid");
      if (targetExp === "senior") return exp.includes("senior");
      if (targetExp === "lead") return exp.includes("lead") || exp.includes("staff") || exp.includes("principal");
      return exp.includes(targetExp);
    });
  }

  // Job type filter ("Full-Time", "Part-Time", "Contract", "Remote", "Hybrid")
  if (job_type) {
    const targetType = job_type.trim().toLowerCase();
    results = results.filter((j) =>
      j.jobType?.toLowerCase().includes(targetType) ||
      (targetType === "remote" && j.location?.toLowerCase().includes("remote"))
    );
  }

  // Location filter
  if (location) {
    const targetLoc = location.trim().toLowerCase();
    results = results.filter((j) =>
      j.location?.toLowerCase().includes(targetLoc) ||
      j.company?.contact?.address?.toLowerCase().includes(targetLoc)
    );
  }

  // Free-text keyword search across title, company, description, requiredSkills
  if (search) {
    const q = search.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);

    results = results.filter((j) => {
      const title = j.title?.toLowerCase() || "";
      const company = j.company?.name?.toLowerCase() || "";
      const desc = j.description?.toLowerCase() || "";
      const skills = j.requirements?.requiredSkills?.join(" ").toLowerCase() || "";
      const preferred = j.requirements?.preferredQualifications?.join(" ").toLowerCase() || "";

      if (title.includes(q) || company.includes(q) || desc.includes(q) || skills.includes(q) || preferred.includes(q)) {
        return true;
      }

      // Token match
      return tokens.every((t) =>
        title.includes(t) || company.includes(t) || desc.includes(t) || skills.includes(t) || preferred.includes(t)
      );
    });
  }

  const totalMatching = results.length;
  const paginated = results.slice(offset, offset + limit);

  return {
    totalMatching,
    returnedCount: paginated.length,
    offset,
    limit,
    filtersApplied: {
      search: search || null,
      tech_stack: tech_stack || null,
      experience_level: experience_level || null,
      job_type: job_type || null,
      location: location || null
    },
    jobs: paginated
  };
}

/**
 * Standardize student format for clean LLM consumption
 */
function formatStudent(s) {
  return {
    id: s.id,
    name: s.name,
    contact: {
      email: s.email,
      mobile: s.mobile
    },
    academics: {
      enrolledYear: s.enrolledYear,
      graduationYear: s.graduationYear
    },
    technicalSkills: s.technicalSkills?.map((ts) => ({
      stack: ts.stack,
      label: ts.label,
      proficiencyLevel: ts.proficiencyLevel,
      subSkills: ts.subSkills
    })) || []
  };
}
