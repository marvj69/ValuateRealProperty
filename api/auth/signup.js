import { createSessionCookie, createUserAccount } from '../../server/lib/auth.js';
import { handleError, json, methodNotAllowed, readJson } from '../../server/lib/http.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return methodNotAllowed(res, ['POST']);
    }

    const body = await readJson(req);
    const user = await createUserAccount(body.email, body.password);

    res.setHeader('Set-Cookie', createSessionCookie(req, user));
    return json(res, 201, {
      authenticated: true,
      user: {
        email: user.email
      }
    });
  } catch (error) {
    return handleError(res, error);
  }
}
