// ============================================================
//  routes/jobs.js – REST API routes for Job Vacancies
// ============================================================

const express = require("express");
const router = express.Router();
let jobs = require("../data/jobs");
const { requireAuth, isAuthorized, sanitizeJob } = require("../middleware/security");

// ────────────────────────────────────────────────────────────
// GET /api/jobs/auth/status
//   Check authentication state and mutation privileges
// ────────────────────────────────────────────────────────────
router.get("/auth/status", (req, res) => {
  const authorized = isAuthorized(req);
  res.status(200).json({
    success: true,
    authenticated: authorized,
    role: authorized ? "employer/admin" : "public",
    canMutateJobs: authorized,
    recruiterPrivacyStatus: authorized
      ? "Full recruiter contact details accessible."
      : "Recruiter personal phone numbers and direct contact names are masked for privacy protection."
  });
});

// ── GET /api/jobs ─────────────────────────────────────────────
// Returns the complete list of all 100 job postings in a single request.
// Also supports optional filtering via query parameters.
router.get("/", (req, res) => {
  try {
    const authorized = isAuthorized(req);
    const { category, techStack, search, jobType, experienceLevel, location, limit, page } = req.query;

    let filtered = [...jobs];

    // Filter by category or techStack (case-insensitive)
    const targetStack = (category || techStack);
    if (targetStack) {
      filtered = filtered.filter(job =>
        job.category.toLowerCase() === targetStack.toLowerCase() ||
        job.techStack.toLowerCase() === targetStack.toLowerCase()
      );
    }

    // Filter by Job Type (e.g., Full-Time, Remote, Hybrid, Contract)
    if (jobType) {
      filtered = filtered.filter(job =>
        job.jobType.toLowerCase().includes(jobType.toLowerCase())
      );
    }

    // Filter by Experience Level (e.g., Entry-Level, Mid-Level, Senior, Lead)
    if (experienceLevel) {
      filtered = filtered.filter(job =>
        job.requirements.experienceLevel.toLowerCase() === experienceLevel.toLowerCase()
      );
    }

    // Filter by Location
    if (location) {
      filtered = filtered.filter(job =>
        job.location.toLowerCase().includes(location.toLowerCase())
      );
    }

    // Free text search (Title, Company, Skills, Description)
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(q) ||
        job.company.name.toLowerCase().includes(q) ||
        job.description.toLowerCase().includes(q) ||
        job.requirements.requiredSkills.some(skill => skill.toLowerCase().includes(q))
      );
    }

    // If explicit pagination parameters are provided
    if (page && limit) {
      const p = Math.max(1, parseInt(page, 10));
      const l = Math.max(1, parseInt(limit, 10));
      const startIndex = (p - 1) * l;
      const paginatedData = filtered.slice(startIndex, startIndex + l).map(j => sanitizeJob(j, authorized));

      return res.status(200).json({
        success: true,
        message: "Jobs fetched successfully (paginated)",
        total: filtered.length,
        page: p,
        limit: l,
        totalPages: Math.ceil(filtered.length / l),
        count: paginatedData.length,
        privacy: {
          recruiterContactMasked: !authorized,
          notice: authorized
            ? "Authenticated session: full recruiter contact details provided."
            : "Recruiter personal phone numbers and direct contact names are masked. Provide X-API-Key or Authorization header for unmasked access."
        },
        data: paginatedData
      });
    }

    // Default: returns complete list (all 100 postings) in a single request
    const sanitizedAll = filtered.map(j => sanitizeJob(j, authorized));
    return res.status(200).json({
      success: true,
      message: "Complete list of all job postings retrieved successfully",
      total: jobs.length,
      count: sanitizedAll.length,
      privacy: {
        recruiterContactMasked: !authorized,
        notice: authorized
          ? "Authenticated session: full recruiter contact details provided."
          : "Recruiter personal phone numbers and direct contact names are masked. Provide X-API-Key or Authorization header for unmasked access."
      },
      data: sanitizedAll
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: err.message
    });
  }
});

// ── GET /api/jobs/categories ──────────────────────────────────
// Returns summary statistics of jobs categorized across tech stacks
router.get("/categories", (req, res) => {
  try {
    const summary = {};
    jobs.forEach(job => {
      const stack = job.techStack || job.category;
      if (!summary[stack]) {
        summary[stack] = {
          category: stack,
          totalVacancies: 0,
          sampleSkills: new Set(),
          jobTypes: new Set()
        };
      }
      summary[stack].totalVacancies += 1;
      job.requirements.requiredSkills.forEach(s => summary[stack].sampleSkills.add(s));
      summary[stack].jobTypes.add(job.jobType);
    });

    const categoryList = Object.values(summary).map(cat => ({
      category: cat.category,
      totalVacancies: cat.totalVacancies,
      sampleSkills: Array.from(cat.sampleSkills).slice(0, 8),
      jobTypes: Array.from(cat.jobTypes)
    }));

    return res.status(200).json({
      success: true,
      totalCategories: categoryList.length,
      totalJobs: jobs.length,
      data: categoryList
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: err.message
    });
  }
});

// ── GET /api/jobs/category/:categoryName ──────────────────────
// Returns all jobs for a specific tech stack category
router.get("/category/:categoryName", (req, res) => {
  const { categoryName } = req.params;
  const authorized = isAuthorized(req);
  const matched = jobs.filter(job =>
    job.category.toLowerCase() === categoryName.toLowerCase() ||
    job.techStack.toLowerCase() === categoryName.toLowerCase()
  );

  if (matched.length === 0) {
    return res.status(404).json({
      success: false,
      error: "Category Not Found",
      message: `No job postings found for tech category '${categoryName}'. Available: MERN, MEAN, Python/Django, Android, iOS, DevOps / Cloud, AI / ML & Data, Java / Spring Boot, Flutter / Cross-Platform`
    });
  }

  const sanitized = matched.map(j => sanitizeJob(j, authorized));
  return res.status(200).json({
    success: true,
    category: categoryName,
    count: sanitized.length,
    privacy: {
      recruiterContactMasked: !authorized,
      notice: authorized
        ? "Authenticated session: full recruiter contact details provided."
        : "Recruiter personal contact info masked."
    },
    data: sanitized
  });
});

// ── GET /api/jobs/:id ─────────────────────────────────────────
// Returns a single job posting by ID
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const authorized = isAuthorized(req);
  const job = jobs.find(j => j.id.toLowerCase() === id.toLowerCase());

  if (!job) {
    return res.status(404).json({
      success: false,
      error: "Job Not Found",
      message: `Job posting with ID '${id}' does not exist.`
    });
  }

  return res.status(200).json({
    success: true,
    privacy: {
      recruiterContactMasked: !authorized,
      notice: authorized
        ? "Authenticated session: full recruiter contact details provided."
        : "Recruiter personal phone numbers and direct contact names are masked. Provide X-API-Key or Authorization header for unmasked access."
    },
    data: sanitizeJob(job, authorized)
  });
});

// ── POST /api/jobs ────────────────────────────────────────────
// Create a new job vacancy posting [Protected: requires valid API key]
router.post("/", requireAuth, (req, res) => {
  const {
    title,
    category,
    techStack,
    company,
    description,
    requirements,
    jobType,
    location,
    salary
  } = req.body;

  if (!title || !description || !company?.name || !requirements?.requiredSkills) {
    return res.status(400).json({
      success: false,
      error: "Validation Error",
      message: "Missing required fields: title, company.name, description, requirements.requiredSkills"
    });
  }

  const newId = `JOB-${String(jobs.length + 1).padStart(3, "0")}`;
  const newJob = {
    id: newId,
    title,
    category: category || techStack || "General Tech",
    techStack: techStack || category || "General Tech",
    company: {
      name: company.name,
      industry: company.industry || "Technology",
      contact: {
        email: company.contact?.email || `careers@${company.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        phone: company.contact?.phone || "+1 (555) 000-0000",
        website: company.contact?.website || "https://example.com",
        address: company.contact?.address || location || "Remote",
        hrContactPerson: company.contact?.hrContactPerson || "Talent Acquisition Team"
      }
    },
    description,
    requirements: {
      experienceLevel: requirements.experienceLevel || "Mid-Level",
      experienceYears: requirements.experienceYears || "3+ years",
      requiredSkills: Array.isArray(requirements.requiredSkills) ? requirements.requiredSkills : [requirements.requiredSkills],
      education: requirements.education || "Bachelor's in Computer Science or equivalent experience",
      preferredQualifications: requirements.preferredQualifications || []
    },
    jobType: jobType || "Full-Time",
    location: location || "Remote",
    salary: salary || "$100,000 - $130,000 / year",
    postedDate: new Date().toISOString().split("T")[0],
    applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    status: "Active"
  };

  jobs.unshift(newJob);

  return res.status(201).json({
    success: true,
    message: "Job posting created successfully",
    data: newJob
  });
});

// ── DELETE /api/jobs/:id ──────────────────────────────────────
// Delete a job vacancy posting [Protected: requires valid API key]
router.delete("/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const index = jobs.findIndex(j => j.id.toLowerCase() === id.toLowerCase());

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: "Job Not Found",
      message: `Job posting with ID '${id}' does not exist.`
    });
  }

  const removed = jobs.splice(index, 1)[0];
  return res.status(200).json({
    success: true,
    message: `Job posting '${id}' deleted successfully.`,
    data: removed
  });
});

module.exports = router;
