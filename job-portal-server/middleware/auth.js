const jwt = require("jsonwebtoken");
const jwksRsa = require("jwks-rsa");

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || "https://job-portal-server.onrender.com/api";
const AUTH0_TEST_SECRET = process.env.AUTH0_TEST_SECRET || "test-auth0-mock-secret-strictly-for-unit-tests-only";

// JWKS Client for live Auth0 key discovery
let jwksClient = null;
if (AUTH0_DOMAIN) {
  jwksClient = jwksRsa({
    jwksUri: `https://${AUTH0_DOMAIN.replace(/\/+$/, "")}/.well-known/jwks.json`,
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10
  });
}

function getKey(header, callback) {
  // If test mode or local test secret configured and header matches HS256/test
  if ((process.env.NODE_ENV === "test" || !AUTH0_DOMAIN) && header.alg === "HS256") {
    return callback(null, AUTH0_TEST_SECRET);
  }

  if (!jwksClient) {
    return callback(new Error("Auth0 domain not configured. Protected operations fail closed."));
  }

  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey ? key.getPublicKey() : key.rsaPublicKey;
    callback(null, signingKey);
  });
}

/**
 * Extract and parse Bearer token from request.
 * Enforces SEC-06: Accepts tokens ONLY in Authorization: Bearer header.
 * Rejects query parameters (?apiKey=...).
 */
function extractBearerToken(req) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || typeof authHeader !== "string") {
    return null;
  }
  const parts = authHeader.trim().split(/\s+/);
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
    return parts[1];
  }
  return null;
}

/**
 * Verify JWT token asynchronously
 */
function verifyToken(token) {
  return new Promise((resolve, reject) => {
    // Basic unverified decode to inspect header
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header) {
      return reject(new Error("Invalid JWT token format"));
    }

    const expectedIssuer = AUTH0_DOMAIN ? `https://${AUTH0_DOMAIN.replace(/\/+$/, "")}/` : undefined;

    getKey(decoded.header, (err, key) => {
      if (err) return reject(err);

      const options = {
        algorithms: decoded.header.alg ? [decoded.header.alg] : ["RS256"]
      };

      if (expectedIssuer) {
        options.issuer = [expectedIssuer, expectedIssuer.replace(/\/$/, "")];
      }
      if (AUTH0_AUDIENCE) {
        options.audience = AUTH0_AUDIENCE;
      }

      jwt.verify(token, key, options, (verifyErr, payload) => {
        if (verifyErr) return reject(verifyErr);

        // Normalize scopes from 'scope' string (space-separated) or 'permissions' array
        let scopes = [];
        if (typeof payload.scope === "string") {
          scopes = payload.scope.split(/\s+/).filter(Boolean);
        }
        if (Array.isArray(payload.permissions)) {
          scopes = [...new Set([...scopes, ...payload.permissions])];
        }

        resolve({
          sub: payload.sub,
          scopes,
          payload
        });
      });
    });
  });
}

/**
 * Middleware: Verify Auth0 Bearer token and check required scope
 */
function requireAuth(requiredScope = null) {
  return async (req, res, next) => {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "Authentication required. Provide a valid Auth0 OAuth access token in 'Authorization: Bearer <token>' header."
      });
    }

    try {
      const user = await verifyToken(token);
      req.user = user;

      // Scope check if required
      if (requiredScope && !user.scopes.includes(requiredScope)) {
        return res.status(403).json({
          success: false,
          error: "Forbidden",
          message: `Insufficient scope: required '${requiredScope}'. Granted: [${user.scopes.join(", ")}]`
        });
      }

      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: `Invalid token: ${err.message}`
      });
    }
  };
}

/**
 * Optional Auth middleware: attaches req.user if a valid token is present
 */
async function optionalAuth(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const user = await verifyToken(token);
    req.user = user;
  } catch (err) {
    req.user = null;
  }
  next();
}

module.exports = {
  requireAuth,
  optionalAuth,
  extractBearerToken,
  verifyToken,
  AUTH0_TEST_SECRET
};
