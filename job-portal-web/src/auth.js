// ============================================================
//  auth.js – Auth0 OAuth 2.0 PKCE Authentication (SEC-05)
// ============================================================

const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN || '';
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID || '';
const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE || '';

const TOKEN_KEY = 'job_auth0_access_token';
const USER_KEY = 'job_auth0_user_profile';
const VERIFIER_KEY = 'job_auth0_code_verifier';

export function isAuth0Configured() {
  return Boolean(AUTH0_DOMAIN && AUTH0_CLIENT_ID);
}

export function getStoredToken() {
  return sessionStorage.getItem(TOKEN_KEY) || '';
}

export function getStoredUser() {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setSession(token, user = null) {
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
    if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  }
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
}

function generateRandomString(length = 43) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const randomValues = new Uint8Array(length);
  window.crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length];
  }
  return result;
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

function base64UrlEncode(buffer) {
  let str = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function loginWithAuth0() {
  if (!isAuth0Configured()) {
    throw new Error('Auth0 is not configured in this environment.');
  }

  const codeVerifier = generateRandomString(64);
  sessionStorage.setItem(VERIFIER_KEY, codeVerifier);

  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64UrlEncode(hashed);

  const cleanDomain = AUTH0_DOMAIN.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const redirectUri = window.location.origin + window.location.pathname;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: AUTH0_CLIENT_ID,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    redirect_uri: redirectUri,
    scope: 'openid profile email read:jobs create:jobs delete:own_jobs delete:any_jobs'
  });

  if (AUTH0_AUDIENCE) {
    params.set('audience', AUTH0_AUDIENCE);
  }

  window.location.href = `https://${cleanDomain}/authorize?${params.toString()}`;
}

export async function handleAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get('error');
  if (error) {
    const errorDesc = urlParams.get('error_description') || error;
    console.warn('[auth0] Authorization error from Auth0:', error, errorDesc);
    window.history.replaceState({}, document.title, window.location.pathname);
    alert(`Auth0 Sign-in Error: ${errorDesc}\n\nHint: If you see "Service not found", create an API in Auth0 Dashboard (Applications > APIs) with Identifier matching your audience.`);
    return false;
  }

  const code = urlParams.get('code');
  if (!code) return false;

  const codeVerifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!codeVerifier || !isAuth0Configured()) return false;

  try {
    const cleanDomain = AUTH0_DOMAIN.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const redirectUri = window.location.origin + window.location.pathname;

    const response = await fetch(`https://${cleanDomain}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: AUTH0_CLIENT_ID,
        code_verifier: codeVerifier,
        code,
        redirect_uri: redirectUri
      })
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${await response.text()}`);
    }

    const data = await response.json();
    setSession(data.access_token, data.id_token ? parseJwt(data.id_token) : null);
    sessionStorage.removeItem(VERIFIER_KEY);

    window.history.replaceState({}, document.title, window.location.pathname);
    return true;
  } catch (err) {
    console.error('[auth0] Error exchanging code for token:', err);
    clearSession();
    return false;
  }
}

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(window.atob(base64))));
  } catch (e) {
    return null;
  }
}

/**
 * Generate a local development Auth0 Bearer token for offline testing (SEC-05, SEC-07)
 */
export async function createLocalDevToken({
  sub = 'auth0|employer-local',
  scopes = 'read:jobs create:jobs delete:own_jobs',
  name = 'Demo Employer (Local Dev)'
} = {}) {
  const enc = new TextEncoder();
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub,
    name,
    email: 'employer@example.com',
    scope: scopes,
    permissions: scopes.split(' '),
    aud: AUTH0_AUDIENCE || 'https://job-portal-server.onrender.com/api',
    iss: 'https://local-auth0-dev/',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400
  };

  const b64H = base64UrlEncode(enc.encode(JSON.stringify(header)));
  const b64P = base64UrlEncode(enc.encode(JSON.stringify(payload)));
  const unsigned = `${b64H}.${b64P}`;

  const key = await window.crypto.subtle.importKey(
    'raw',
    enc.encode('test-auth0-mock-secret-strictly-for-unit-tests-only'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await window.crypto.subtle.sign('HMAC', key, enc.encode(unsigned));
  const b64S = base64UrlEncode(signature);
  return `${unsigned}.${b64S}`;
}
