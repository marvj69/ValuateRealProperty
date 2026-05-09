import { createSessionCookie, normalizeEmail, verifyAccessCode } from '../lib/auth.js';
import { handleError, json, methodNotAllowed, readJson } from '../lib/http.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return methodNotAllowed(res, ['POST']);
    }

    const body = await readJson(req);
    const email = normalizeEmail(body.email);
    verifyAccessCode(body.accessCode);

    res.setHeader('Set-Cookie', createSessionCookie(req, email));
    return json(res, 200, {
      authenticated: true,
      user: {
        email
      }
    });
  } catch (error) {
    return handleError(res, error);
  }
}
