import { requireUser } from '../lib/auth.js';
import {
  firstQueryValue,
  handleError,
  json,
  methodNotAllowed
} from '../lib/http.js';
import { deleteReportForUser, getReportForUser } from '../lib/reports.js';

export default async function handler(req, res) {
  try {
    const user = requireUser(req);
    const id = firstQueryValue(req.query?.id);

    if (req.method === 'GET') {
      const report = await getReportForUser(user, id);
      return json(res, 200, { report });
    }

    if (req.method === 'DELETE') {
      const result = await deleteReportForUser(user, id);
      return json(res, 200, result);
    }

    return methodNotAllowed(res, ['GET', 'DELETE']);
  } catch (error) {
    return handleError(res, error);
  }
}
