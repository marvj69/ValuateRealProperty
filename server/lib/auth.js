import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { ensureSchema, sql } from './db.js';
import { HttpError } from './http.js';

const COOKIE_NAME = 'valuate_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 256;
const PASSWORD_KEY_LENGTH = 64;
const scryptAsync = promisify(crypto.scrypt);

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
  const a = Buffer.isBuffer(left) ? left : Buffer.from(String(left || ''));
  const b = Buffer.isBuffer(right) ? right : Buffer.from(String(right || ''));
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

function normalizePassword(password, { requireStrength = true } = {}) {
  const normalized = String(password || '');
  if (!normalized) {
    throw new HttpError(400, 'Password is required.');
  }
  if (requireStrength && normalized.length < PASSWORD_MIN_LENGTH) {
    throw new HttpError(400, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  if (normalized.length > PASSWORD_MAX_LENGTH) {
    throw new HttpError(400, `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`);
  }
  return normalized;
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const key = await scryptAsync(password, salt, PASSWORD_KEY_LENGTH);
  return `scrypt:${PASSWORD_KEY_LENGTH}:${salt}:${Buffer.from(key).toString('base64url')}`;
}

async function verifyPassword(password, passwordHash) {
  const [algorithm, keyLengthText, salt, encodedKey] = String(passwordHash || '').split(':');
  const keyLength = Number.parseInt(keyLengthText, 10);
  if (
    algorithm !== 'scrypt' ||
    !Number.isInteger(keyLength) ||
    keyLength < 32 ||
    keyLength > 128 ||
    !salt ||
    !encodedKey
  ) {
    return false;
  }

  const storedKey = Buffer.from(encodedKey, 'base64url');
  if (storedKey.length !== keyLength) return false;

  const derivedKey = Buffer.from(await scryptAsync(password, salt, keyLength));
  return safeEqual(derivedKey, storedKey);
}

function isUniqueViolation(error) {
  return error?.code === '23505' || /duplicate key/i.test(String(error?.message || ''));
}

export async function createUserAccount(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = normalizePassword(password);
  const passwordHash = await hashPassword(normalizedPassword);
  const userId = userIdForEmail(normalizedEmail);

  await ensureSchema();

  try {
    const { rows } = await sql`
      INSERT INTO app_users (id, email, password_hash)
      VALUES (${userId}, ${normalizedEmail}, ${passwordHash})
      RETURNING id, email
    `;

    return {
      userId: rows[0].id,
      email: rows[0].email
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new HttpError(409, 'An account already exists for that email. Sign in instead.');
    }
    throw error;
  }
}

export async function authenticateUser(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = normalizePassword(password, { requireStrength: false });

  await ensureSchema();

  const { rows } = await sql`
    SELECT id, email, password_hash
    FROM app_users
    WHERE email = ${normalizedEmail}
    LIMIT 1
  `;
  const user = rows[0] || null;
  if (!user) {
    throw new HttpError(401, 'No account exists for that email. Create an account first.');
  }

  const verified = await verifyPassword(normalizedPassword, user.password_hash);
  if (!verified) {
    throw new HttpError(401, 'Invalid email or password.');
  }

  return {
    userId: user.id,
    email: user.email
  };
}

export function createSessionCookie(req, userOrEmail) {
  const normalizedEmail = normalizeEmail(
    typeof userOrEmail === 'string' ? userOrEmail : userOrEmail?.email
  );
  const userId = typeof userOrEmail === 'object' && userOrEmail?.userId
    ? userOrEmail.userId
    : userIdForEmail(normalizedEmail);
  const now = Math.floor(Date.now() / 1000);
  const session = {
    email: normalizedEmail,
    userId,
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
