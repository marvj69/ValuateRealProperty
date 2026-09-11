import { clearSessionCookie } from '../../server/lib/auth.js';
import { handleError, json, methodNotAllowed } from '../../server/lib/http.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return methodNotAllowed(res, ['POST']);
    }

    res.setHeader('Set-Cookie', clearSessionCookie(req));
    return json(res, 200, {
      authenticated: false
    });
  } catch (error) {
    return handleError(res, error);
  }
}
