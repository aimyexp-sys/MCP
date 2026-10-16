const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const initialJobs = require("./jobs");

const PERSISTED_FILE = path.join(__dirname, "jobs-persisted.json");
const AUDIT_LOG_FILE = path.join(__dirname, "audit-log.json");

let memoryJobs = null;

function loadJobs() {
  if (memoryJobs) return memoryJobs;

  try {
    if (fs.existsSync(PERSISTED_FILE)) {
      const data = fs.readFileSync(PERSISTED_FILE, "utf-8");
      memoryJobs = JSON.parse(data);
    } else {
      // Seed from initial jobs.js
      memoryJobs = JSON.parse(JSON.stringify(initialJobs));
      saveJobs(memoryJobs);
    }
  } catch (err) {
    console.error("[storage] Error reading persisted jobs, fallback to seed:", err.message);
    memoryJobs = JSON.parse(JSON.stringify(initialJobs));
  }

  return memoryJobs;
}

function saveJobs(jobs) {
  try {
    const tempFile = `${PERSISTED_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(jobs, null, 2), "utf-8");
    fs.renameSync(tempFile, PERSISTED_FILE);
  } catch (err) {
    console.error("[storage] Failed to save jobs-persisted.json:", err.message);
  }
}

function recordAudit({ action, jobId, jobTitle, userSub, userScopes, ip, userAgent, details }) {
  const event = {
    id: `audit-${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
    action, // 'JOB_CREATED' | 'JOB_DELETED'
    jobId,
    jobTitle: jobTitle || null,
    userSub: userSub || "anonymous",
    userScopes: Array.isArray(userScopes) ? userScopes : [],
    ip: ip || null,
    userAgent: userAgent || null,
    details: details || {}
  };

  try {
    let logs = [];
    if (fs.existsSync(AUDIT_LOG_FILE)) {
      try {
        logs = JSON.parse(fs.readFileSync(AUDIT_LOG_FILE, "utf-8"));
      } catch (e) {
        logs = [];
      }
    }
    logs.push(event);
    const tempFile = `${AUDIT_LOG_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(logs, null, 2), "utf-8");
    fs.renameSync(tempFile, AUDIT_LOG_FILE);
  } catch (err) {
    console.error("[storage] Failed to write audit-log.json:", err.message);
  }

  return event;
}

function getAuditLogs() {
  try {
    if (fs.existsSync(AUDIT_LOG_FILE)) {
      return JSON.parse(fs.readFileSync(AUDIT_LOG_FILE, "utf-8"));
    }
  } catch (e) {
    return [];
  }
  return [];
}

function getJobs() {
  return loadJobs();
}

function addJob(job) {
  const current = loadJobs();
  current.unshift(job);
  saveJobs(current);
  return job;
}

function deleteJob(id) {
  const current = loadJobs();
  const index = current.findIndex((j) => j.id.toLowerCase() === id.toLowerCase());
  if (index === -1) return null;
  const removed = current.splice(index, 1)[0];
  saveJobs(current);
  return removed;
}

function resetStorage() {
  memoryJobs = JSON.parse(JSON.stringify(initialJobs));
  saveJobs(memoryJobs);
}

module.exports = {
  getJobs,
  addJob,
  deleteJob,
  recordAudit,
  getAuditLogs,
  resetStorage,
  PERSISTED_FILE,
  AUDIT_LOG_FILE
};
