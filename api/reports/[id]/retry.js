import { waitUntil } from '@vercel/functions';
import { requireUser } from '../../lib/auth.js';
import {
  firstQueryValue,
  handleError,
  json,
  methodNotAllowed
} from '../../lib/http.js';
import { processReportById, retryReportForUser } from '../../lib/reports.js';

export default async function handler(req, res) {
  try {
    const user = requireUser(req);

    if (req.method !== 'POST') {
      return methodNotAllowed(res, ['POST']);
    }

    const id = firstQueryValue(req.query?.id);
    const report = await retryReportForUser(user, id);
    waitUntil(
      processReportById(report.id).catch((error) => {
        console.error(`Background report retry failed for ${report.id}`, error);
      })
    );
    return json(res, 202, { report });
  } catch (error) {
    return handleError(res, error);
  }
}
