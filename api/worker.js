import { getUserFromRequest } from './lib/auth.js';
import {
  firstQueryValue,
  handleError,
  HttpError,
  json,
  methodNotAllowed
} from './lib/http.js';
import { processAvailableReports } from './lib/reports.js';

function parseLimit(req) {
  const value = firstQueryValue(req.query?.limit);
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(5, Math.max(1, parsed));
}

function hasCronSecret(req) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.authorization || '';
  return Boolean(secret && header === `Bearer ${secret}`);
}

export default async function handler(req, res) {
  try {
    if (!['GET', 'POST'].includes(req.method)) {
      return methodNotAllowed(res, ['GET', 'POST']);
    }

    const limit = parseLimit(req);

    if (hasCronSecret(req)) {
      const result = await processAvailableReports({ limit });
      return json(res, 200, result);
    }

    if (req.method === 'POST') {
      const user = getUserFromRequest(req);
      if (!user) {
        throw new HttpError(401, 'Authentication or CRON_SECRET bearer token required.');
      }
      const result = await processAvailableReports({ limit, userId: user.userId });
      return json(res, 200, result);
    }

    throw new HttpError(401, 'CRON_SECRET bearer token required.');
  } catch (error) {
    return handleError(res, error);
  }
}
