// ============================================================
//  routes/jobs.js – REST API routes for Job Vacancies
// ============================================================

const express = require("express");
const router = express.Router();
const storage = require("../data/storage");
const { sanitizeJob } = require("../middleware/security");
const { requireAuth, optionalAuth } = require("../middleware/auth");

// ────────────────────────────────────────────────────────────
// GET /api/jobs/auth/status
//   Check OAuth authentication state and mutation privileges
// ────────────────────────────────────────────────────────────
router.get("/auth/status", optionalAuth, (req, res) => {
  const user = req.user;
  const authenticated = Boolean(user);
  const scopes = user ? user.scopes : [];

  res.status(200).json({
    success: true,
    authenticated,
    user: user ? { sub: user.sub, scopes: user.scopes } : null,
    canCreateJobs: scopes.includes("create:jobs"),
    canDeleteOwnJobs: scopes.includes("delete:own_jobs"),
    canDeleteAnyJobs: scopes.includes("delete:any_jobs"),
    recruiterPrivacyStatus: authenticated
      ? "Authenticated session: authorized recruiter details accessible."
      : "Recruiter personal phone numbers and direct contact names are masked for privacy protection."
  });
});

// ────────────────────────────────────────────────────────────
// GET /api/jobs/audit/logs
//   Retrieve audit trail of job mutations (Admin only)
// ────────────────────────────────────────────────────────────
router.get("/audit/logs", requireAuth("delete:any_jobs"), (req, res) => {
  const logs = storage.getAuditLogs();
  res.status(200).json({
    success: true,
    count: logs.length,
    data: logs
  });
});

// ── GET /api/jobs ─────────────────────────────────────────────
// Returns list of job postings with optional filtering & pagination
router.get("/", optionalAuth, (req, res) => {
  try {
    const jobs = storage.getJobs();
    const authorized = Boolean(req.user);
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

    // Filter by Job Type
    if (jobType) {
      filtered = filtered.filter(job =>
        job.jobType.toLowerCase().includes(jobType.toLowerCase())
      );
    }

    // Filter by Experience Level
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

    // Free text search
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(q) ||
        job.company.name.toLowerCase().includes(q) ||
        job.description.toLowerCase().includes(q) ||
        job.requirements.requiredSkills.some(skill => skill.toLowerCase().includes(q))
      );
    }

    // Explicit pagination
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
            : "Recruiter personal phone numbers and direct contact names are masked."
        },
        data: paginatedData
      });
    }

    // Default: returns complete list
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
          : "Recruiter personal phone numbers and direct contact names are masked."
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
router.get("/categories", (req, res) => {
  try {
    const jobs = storage.getJobs();
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
router.get("/category/:categoryName", optionalAuth, (req, res) => {
  const { categoryName } = req.params;
  const authorized = Boolean(req.user);
  const jobs = storage.getJobs();
  const matched = jobs.filter(job =>
    job.category.toLowerCase() === categoryName.toLowerCase() ||
    job.techStack.toLowerCase() === categoryName.toLowerCase()
  );

  if (matched.length === 0) {
    return res.status(404).json({
      success: false,
      error: "Category Not Found",
      message: `No job postings found for tech category '${categoryName}'.`
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
router.get("/:id", optionalAuth, (req, res) => {
  const { id } = req.params;
  const authorized = Boolean(req.user);
  const jobs = storage.getJobs();
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
        : "Recruiter personal phone numbers and direct contact names are masked."
    },
    data: sanitizeJob(job, authorized)
  });
});

// ── POST /api/jobs ────────────────────────────────────────────
// Create a new job vacancy posting [SEC-07: Requires Auth0 Bearer token with 'create:jobs']
router.post("/", requireAuth("create:jobs"), (req, res) => {
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

  const jobs = storage.getJobs();
  const newId = `JOB-${String(jobs.length + 1).padStart(3, "0")}`;
  const newJob = {
    id: newId,
    title,
    category: category || techStack || "General Tech",
    techStack: techStack || category || "General Tech",
    creatorSub: req.user.sub, // Persist creator Auth0 sub (SEC-07)
    createdAt: new Date().toISOString(),
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

  storage.addJob(newJob);

  // Record mutation audit event (SEC-07)
  storage.recordAudit({
    action: "JOB_CREATED",
    jobId: newJob.id,
    jobTitle: newJob.title,
    userSub: req.user.sub,
    userScopes: req.user.scopes,
    ip: req.ip,
    userAgent: req.headers["user-agent"]
  });

  return res.status(201).json({
    success: true,
    message: "Job posting created successfully",
    data: newJob
  });
});

// ── DELETE /api/jobs/:id ──────────────────────────────────────
// Delete a job vacancy posting [SEC-07: Requires 'delete:any_jobs' or ownership-checked 'delete:own_jobs']
router.delete("/:id", requireAuth(), (req, res) => {
  const { id } = req.params;
  const user = req.user;
  const hasDeleteAny = user.scopes.includes("delete:any_jobs");
  const hasDeleteOwn = user.scopes.includes("delete:own_jobs");

  if (!hasDeleteAny && !hasDeleteOwn) {
    return res.status(403).json({
      success: false,
      error: "Forbidden",
      message: "Insufficient scope: requires 'delete:own_jobs' or 'delete:any_jobs'."
    });
  }

  const jobs = storage.getJobs();
  const job = jobs.find(j => j.id.toLowerCase() === id.toLowerCase());

  if (!job) {
    return res.status(404).json({
      success: false,
      error: "Job Not Found",
      message: `Job posting with ID '${id}' does not exist.`
    });
  }

  // Ownership check: if user only has delete:own_jobs, verify creatorSub matches user.sub
  if (!hasDeleteAny && hasDeleteOwn) {
    if (!job.creatorSub || job.creatorSub !== user.sub) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "Ownership violation: You can only delete job postings created by your account."
      });
    }
  }

  const removed = storage.deleteJob(id);

  // Record mutation audit event (SEC-07)
  storage.recordAudit({
    action: "JOB_DELETED",
    jobId: id,
    jobTitle: job.title,
    userSub: user.sub,
    userScopes: user.scopes,
    ip: req.ip,
    userAgent: req.headers["user-agent"]
  });

  return res.status(200).json({
    success: true,
    message: `Job posting '${id}' deleted successfully.`,
    data: removed
  });
});

module.exports = router;
