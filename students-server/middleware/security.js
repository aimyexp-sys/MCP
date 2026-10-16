// ============================================================
//  middleware/security.js – CORS & Student Data Formatting
// ============================================================

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://localhost:4000",
  "http://localhost:8080",
  "https://students-portal.onrender.com",
  "https://job-portal-web.onrender.com",
  "https://exp-portal-mcp-server.onrender.com"
];

/**
 * Configure strict CORS allowlist (SEC-03: Exact origins, reject '*', credentials: false)
 */
function getCorsOptions() {
  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
        .map((s) => s.trim())
        .filter((s) => s && s !== "*") // Reject '*'
    : [];

  const allowedOriginsSet = new Set([...defaultAllowedOrigins, ...envOrigins]);

  return {
    origin: (origin, callback) => {
      // Calls without Origin (e.g. curl, server-to-server) pass CORS check,
      // but protected operations still require Authorization: Bearer <token>.
      if (!origin) return callback(null, true);

      if (allowedOriginsSet.has(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false
  };
}

/**
 * Minimize / mask email address for privacy
 * Example: 'aarav885@outlook.com' -> 'aa***5@outlook.com'
 */
function maskEmail(email) {
  if (!email || !email.includes("@")) return "***@***.com";
  const [user, domain] = email.split("@");
  if (user.length <= 2) {
    return `${user[0]}***@${domain}`;
  }
  return `${user.slice(0, 2)}***${user.slice(-1)}@${domain}`;
}

/**
 * Minimize / mask mobile number for privacy
 * Example: '+91 7786950113' -> '+91 77*****113'
 */
function maskMobile(mobile) {
  if (!mobile) return "+91 **********";
  const clean = mobile.trim();
  if (clean.length > 7) {
    const spaceIdx = clean.indexOf(" ");
    const prefix = spaceIdx !== -1 ? clean.slice(0, spaceIdx + 3) : clean.slice(0, 5);
    const suffix = clean.slice(-3);
    return `${prefix}*****${suffix}`;
  }
  return "+91 **********";
}

/**
 * Format student record based on authorization status
 * (SEC-04 is excluded per user instruction, preserving current formatting)
 */
function formatStudent(student, authorized = false) {
  if (authorized) {
    return {
      ...student,
      isContactMasked: false
    };
  }

  return {
    ...student,
    email: maskEmail(student.email),
    mobile: maskMobile(student.mobile),
    isContactMasked: true
  };
}

module.exports = {
  getCorsOptions,
  maskEmail,
  maskMobile,
  formatStudent
};
