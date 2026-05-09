import { getUserFromRequest } from '../../server/lib/auth.js';
import { handleError, json, methodNotAllowed } from '../../server/lib/http.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return methodNotAllowed(res, ['GET']);
    }

    const user = getUserFromRequest(req);
    return json(res, 200, {
      authenticated: Boolean(user),
      user: user ? { email: user.email } : null
    });
  } catch (error) {
    return handleError(res, error);
  }
}
