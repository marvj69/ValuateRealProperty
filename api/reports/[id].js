import { waitUntil } from '@vercel/functions';
import { requireUser } from '../../server/lib/auth.js';
import {
  firstQueryValue,
  handleError,
  json,
  methodNotAllowed
} from '../../server/lib/http.js';
import {
  deleteReportForUser,
  getReportForUser,
  processReportById,
  recoverStaleReportForUser
} from '../../server/lib/reports.js';

export default async function handler(req, res) {
  try {
    const user = requireUser(req);
    const id = firstQueryValue(req.query?.id);

    if (req.method === 'GET') {
      const recoveredReport = await recoverStaleReportForUser(user, id);
      if (recoveredReport?.status === 'queued') {
        waitUntil(
          processReportById(recoveredReport.id).catch((error) => {
            console.error(`Recovered report processing failed for ${recoveredReport.id}`, error);
          })
        );
      }
      const report = recoveredReport || await getReportForUser(user, id);
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
