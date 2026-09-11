import { requireUser } from '../../server/lib/auth.js';
import { handleError, json, methodNotAllowed } from '../../server/lib/http.js';
import { getReportUsageForUser } from '../../server/lib/reports.js';

export default async function handler(req, res) {
  try {
    const user = requireUser(req);

    if (req.method !== 'GET') {
      return methodNotAllowed(res, ['GET']);
    }

    const usage = await getReportUsageForUser(user);
    return json(res, 200, { usage });
  } catch (error) {
    return handleError(res, error);
  }
}
