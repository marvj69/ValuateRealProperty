import { waitUntil } from '@vercel/functions';
import { requireUser } from '../lib/auth.js';
import { handleError, json, methodNotAllowed, readJson } from '../lib/http.js';
import { createReportJob, listReportsForUser, processReportById } from '../lib/reports.js';

export default async function handler(req, res) {
  try {
    const user = requireUser(req);

    if (req.method === 'GET') {
      const reports = await listReportsForUser(user);
      return json(res, 200, { reports });
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      const report = await createReportJob(user, body);
      waitUntil(
        processReportById(report.id).catch((error) => {
          console.error(`Background report processing failed for ${report.id}`, error);
        })
      );
      return json(res, 202, { report });
    }

    return methodNotAllowed(res, ['GET', 'POST']);
  } catch (error) {
    return handleError(res, error);
  }
}
