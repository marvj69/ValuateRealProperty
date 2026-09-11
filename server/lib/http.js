export class HttpError extends Error {
  constructor(status, message, details = null, headers = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
    this.headers = headers;
  }
}

const DEFAULT_MAX_JSON_BODY_CHARS = 5_500_000;

function getMaxJsonBodyChars() {
  const configured = Number.parseInt(
    process.env.MAX_JSON_BODY_CHARS || String(DEFAULT_MAX_JSON_BODY_CHARS),
    10
  );
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_MAX_JSON_BODY_CHARS;
}

function assertJsonBodySize(raw) {
  if (String(raw || '').length > getMaxJsonBodyChars()) {
    throw new HttpError(413, 'Request body is too large.');
  }
}

export function json(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
  res.end(JSON.stringify(body));
}

export function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '));
  json(res, 405, { error: 'Method not allowed' });
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  const raw = typeof req.body === 'string'
    ? req.body
    : Buffer.isBuffer(req.body)
      ? req.body.toString('utf8')
      : await new Promise((resolve, reject) => {
          let body = '';
          let rejected = false;
          req.setEncoding('utf8');
          req.on('data', (chunk) => {
            if (rejected) return;
            body += chunk;
            if (body.length > getMaxJsonBodyChars()) {
              rejected = true;
              reject(new HttpError(413, 'Request body is too large.'));
            }
          });
          req.on('end', () => {
            if (!rejected) resolve(body);
          });
          req.on('error', reject);
        });

  assertJsonBodySize(raw);

  if (!raw.trim()) return {};

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new HttpError(400, 'Request body must be valid JSON.');
  }
}

export function handleError(res, error) {
  const status = Number.isInteger(error?.status) ? error.status : 500;
  const body = {
    error: status >= 500 ? 'Internal server error' : error.message
  };
  if (error?.details) {
    body.details = error.details;
  }
  if (status >= 500) {
    console.error(error);
  }
  json(res, status, body, error?.headers || {});
}

export function firstQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}
