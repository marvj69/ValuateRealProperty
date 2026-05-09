import crypto from 'node:crypto';
import { HttpError } from './http.js';

const COOKIE_NAME = 'valuate_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function getSecret() {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret) {
    throw new HttpError(500, 'AUTH_SESSION_SECRET is not configured.');
  }
  return secret;
}

function sign(payload) {
  return crypto
    .createHmac('sha256', getSecret())
    .update(payload)
    .digest('base64url');
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        if (index === -1) return [part, ''];
        return [
          decodeURIComponent(part.slice(0, index)),
          decodeURIComponent(part.slice(index + 1))
        ];
      })
  );
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  return parts.join('; ');
}

function shouldUseSecureCookie(req) {
  return (
    process.env.NODE_ENV === 'production' ||
    req.headers['x-forwarded-proto'] === 'https' ||
    Boolean(process.env.VERCEL)
  );
}

export function normalizeEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new HttpError(400, 'A valid email address is required.');
  }
  return normalized;
}

export function userIdForEmail(email) {
  return crypto.createHash('sha256').update(normalizeEmail(email)).digest('hex');
}

export function verifyAccessCode(accessCode) {
  const expected = process.env.AUTH_ACCESS_CODE;
  if (!expected) {
    throw new HttpError(500, 'AUTH_ACCESS_CODE is not configured.');
  }
  if (!safeEqual(accessCode, expected)) {
    throw new HttpError(401, 'Invalid email or access code.');
  }
}

export function createSessionCookie(req, email) {
  const normalizedEmail = normalizeEmail(email);
  const now = Math.floor(Date.now() / 1000);
  const session = {
    email: normalizedEmail,
    userId: userIdForEmail(normalizedEmail),
    iat: now,
    exp: now + SESSION_TTL_SECONDS
  };
  const payload = base64UrlEncode(JSON.stringify(session));
  const signature = sign(payload);
  return serializeCookie(COOKIE_NAME, `${payload}.${signature}`, {
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
    httpOnly: true,
    secure: shouldUseSecureCookie(req),
    sameSite: 'Lax'
  });
}

export function clearSessionCookie(req) {
  return serializeCookie(COOKIE_NAME, '', {
    maxAge: 0,
    expires: new Date(0),
    path: '/',
    httpOnly: true,
    secure: shouldUseSecureCookie(req),
    sameSite: 'Lax'
  });
}

export function getUserFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];
  if (!token) return null;

  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(sign(payload), signature)) {
    return null;
  }

  try {
    const session = JSON.parse(base64UrlDecode(payload));
    const now = Math.floor(Date.now() / 1000);
    if (!session.email || !session.userId || !session.exp || session.exp <= now) {
      return null;
    }
    return {
      email: session.email,
      userId: session.userId
    };
  } catch (error) {
    return null;
  }
}

export function requireUser(req) {
  const user = getUserFromRequest(req);
  if (!user) {
    throw new HttpError(401, 'Authentication required.');
  }
  return user;
}
