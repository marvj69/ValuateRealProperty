export class HttpError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
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
          req.setEncoding('utf8');
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => resolve(body));
          req.on('error', reject);
        });

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
  json(res, status, body);
}

export function firstQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}
