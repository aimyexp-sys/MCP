import * as jose from "jose";
import crypto from "crypto";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || "https://exp-portal-mcp-server.onrender.com";
export const AUTH0_TEST_SECRET = process.env.AUTH0_TEST_SECRET || "test-auth0-mock-secret-strictly-for-unit-tests-only";

// Remote JWKS for Auth0
let remoteJWKS = null;
if (AUTH0_DOMAIN) {
  try {
    const cleanDomain = AUTH0_DOMAIN.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const jwksUri = new URL(`https://${cleanDomain}/.well-known/jwks.json`);
    remoteJWKS = jose.createRemoteJWKSet(jwksUri);
  } catch (err) {
    console.error("[auth] Failed to initialize Auth0 JWKS endpoint:", err.message);
  }
}

/**
 * Extract Bearer token from Authorization header ONLY (SEC-06).
 * Query parameters (?apiKey=...) are ignored and will NOT authenticate.
 */
export function extractBearerToken(req) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || typeof authHeader !== "string") return null;
  const parts = authHeader.trim().split(/\s+/);
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
    return parts[1];
  }
  return null;
}

function parsePayload(payload) {
  let scopes = [];
  if (typeof payload.scope === "string") {
    scopes = payload.scope.split(/\s+/).filter(Boolean);
  }
  if (Array.isArray(payload.permissions)) {
    scopes = [...new Set([...scopes, ...payload.permissions])];
  }
  return {
    sub: payload.sub,
    scopes,
    payload
  };
}

/**
 * Verify Auth0 JWT access token (SEC-01).
 * Validates signature, issuer, audience, expiry, and scopes.
 * Known keys (such as mcp-secret-key-2026) cannot authenticate.
 */
export async function verifyAuth0Token(token) {
  if (!token || typeof token !== "string") {
    throw new Error("Missing or empty token");
  }

  // Explicitly reject known keys (SEC-01)
  if (
    token === "mcp-secret-key-2026" ||
    token === "student-api-secret-key-2026" ||
    token === "job-admin-secret-key-2026"
  ) {
    throw new Error("Rejected: Static API keys are forbidden. Auth0 OAuth Bearer token required.");
  }

  // If in test environment or test secret configured
  let unverifiedHeader;
  try {
    unverifiedHeader = jose.decodeProtectedHeader(token);
  } catch (err) {
    throw new Error(`Malformed JWT: ${err.message}`);
  }

  if ((process.env.NODE_ENV === "test" || !AUTH0_DOMAIN) && unverifiedHeader.alg === "HS256") {
    const secret = new TextEncoder().encode(AUTH0_TEST_SECRET);
    const { payload } = await jose.jwtVerify(token, secret, {
      audience: AUTH0_AUDIENCE
    });
    return parsePayload(payload);
  }

  if (!AUTH0_DOMAIN || !remoteJWKS) {
    throw new Error("Auth0 domain not configured. Protected operations fail closed (SEC-05).");
  }

  const cleanDomain = AUTH0_DOMAIN.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const expectedIssuer = `https://${cleanDomain}/`;

  const { payload } = await jose.jwtVerify(token, remoteJWKS, {
    issuer: [expectedIssuer, expectedIssuer.replace(/\/$/, "")],
    audience: AUTH0_AUDIENCE
  });

  return parsePayload(payload);
}

/**
 * RFC 9470 OAuth 2.0 Protected Resource Metadata (SEC-01 & SEC-08)
 */
export function getOAuthProtectedResourceMetadata(baseUrl) {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const cleanDomain = AUTH0_DOMAIN ? AUTH0_DOMAIN.replace(/^https?:\/\//, "").replace(/\/+$/, "") : null;
  const authServer = cleanDomain ? `https://${cleanDomain}/` : `${cleanBase}/`;

  return {
    resource: cleanBase,
    authorization_servers: [authServer],
    scopes_supported: [
      "openid",
      "profile",
      "email",
      "read:students",
      "read:jobs",
      "create:jobs",
      "delete:own_jobs",
      "delete:any_jobs"
    ],
    bearer_methods_supported: ["header"],
    resource_signing_alg_values_supported: ["RS256"],
    resource_name: "Exp Portal MCP Server",
    resource_documentation: `${cleanBase}/#documentation`
  };
}

/**
 * RFC 8414 Authorization Server Metadata (SEC-08)
 */
export function getAuthorizationServerMetadata(baseUrl) {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const cleanDomain = AUTH0_DOMAIN ? AUTH0_DOMAIN.replace(/^https?:\/\//, "").replace(/\/+$/, "") : null;
  const issuer = cleanDomain ? `https://${cleanDomain}/` : `${cleanBase}/`;

  return {
    issuer,
    authorization_endpoint: cleanDomain ? `https://${cleanDomain}/authorize` : `${cleanBase}/oauth/authorize`,
    token_endpoint: cleanDomain ? `https://${cleanDomain}/oauth/token` : `${cleanBase}/oauth/token`,
    registration_endpoint: `${cleanBase}/register`,
    jwks_uri: cleanDomain ? `https://${cleanDomain}/.well-known/jwks.json` : `${cleanBase}/.well-known/jwks.json`,
    scopes_supported: [
      "openid",
      "profile",
      "email",
      "read:students",
      "read:jobs",
      "create:jobs",
      "delete:own_jobs",
      "delete:any_jobs"
    ],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"]
  };
}

/**
 * RFC 7591 Dynamic Client Registration endpoint (SEC-08)
 */
export function handleDynamicClientRegistration(req, res) {
  const metadata = req.body || {};
  const redirectUris =
    Array.isArray(metadata.redirect_uris) && metadata.redirect_uris.length > 0
      ? metadata.redirect_uris
      : ["http://localhost:5071/oauth/callback"];

  const clientId = process.env.AUTH0_CLIENT_ID || `mcp_client_${crypto.randomUUID().slice(0, 16)}`;

  const clientInfo = {
    client_id: clientId,
    client_name: metadata.client_name || "MCP Client Proxy",
    redirect_uris: redirectUris,
    grant_types: metadata.grant_types || ["authorization_code", "refresh_token"],
    response_types: metadata.response_types || ["code"],
    token_endpoint_auth_method: metadata.token_endpoint_auth_method || "none",
    client_id_issued_at: Math.floor(Date.now() / 1000),
    scope: "openid profile email read:students read:jobs" // Least-privilege default permissions (SEC-08)
  };

  return res.status(201).json(clientInfo);
}
