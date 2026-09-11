import { createSessionCookie, resetPasswordWithToken } from '../../../server/lib/auth.js';
import { handleError, json, methodNotAllowed, readJson } from '../../../server/lib/http.js';
import { getSettingsForUser } from '../../../server/lib/settings.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return methodNotAllowed(res, ['POST']);
    }

    const body = await readJson(req);
    const user = await resetPasswordWithToken(body.token, body.password);
    const settings = await getSettingsForUser(user);

    res.setHeader('Set-Cookie', createSessionCookie(req, user));
    return json(res, 200, {
      authenticated: true,
      user: {
        email: user.email
      },
      settings
    });
  } catch (error) {
    return handleError(res, error);
  }
}
