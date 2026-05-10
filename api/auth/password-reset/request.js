import {
  buildPasswordResetUrl,
  createPasswordResetToken,
  shouldExposePasswordResetToken
} from '../../../server/lib/auth.js';
import { handleError, json, methodNotAllowed, readJson } from '../../../server/lib/http.js';

const GENERIC_RESET_MESSAGE = 'If an account exists for that email, a password reset link will be sent.';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return methodNotAllowed(res, ['POST']);
    }

    const body = await readJson(req);
    const reset = await createPasswordResetToken(body.email);
    const response = {
      success: true,
      message: GENERIC_RESET_MESSAGE
    };

    if (reset.token && shouldExposePasswordResetToken()) {
      response.reset = {
        token: reset.token,
        resetUrl: buildPasswordResetUrl(req, reset.token),
        expiresAt: reset.expiresAt
      };
    }

    return json(res, 200, response);
  } catch (error) {
    return handleError(res, error);
  }
}
