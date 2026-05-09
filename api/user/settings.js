import { requireUser } from '../../server/lib/auth.js';
import { handleError, json, methodNotAllowed, readJson } from '../../server/lib/http.js';
import { getSettingsForUser, updateSettingsForUser } from '../../server/lib/settings.js';

export default async function handler(req, res) {
  try {
    const user = requireUser(req);

    if (req.method === 'GET') {
      const settings = await getSettingsForUser(user);
      return json(res, 200, { settings });
    }

    if (req.method === 'PATCH') {
      const body = await readJson(req);
      const settings = await updateSettingsForUser(user, body);
      return json(res, 200, { settings });
    }

    return methodNotAllowed(res, ['GET', 'PATCH']);
  } catch (error) {
    return handleError(res, error);
  }
}
