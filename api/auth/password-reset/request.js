import {
  buildPasswordResetUrl,
  createPasswordResetToken,
  shouldExposePasswordResetToken
} from '../../../server/lib/auth.js';
import {
  assertPasswordResetEmailConfigured,
  getPasswordResetEmailConfig,
  sendPasswordResetEmail
} from '../../../server/lib/email.js';
import { handleError, json, methodNotAllowed, readJson } from '../../../server/lib/http.js';

const GENERIC_RESET_MESSAGE = 'If an account exists for that email, a password reset link will be sent.';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return methodNotAllowed(res, ['POST']);
    }

    const body = await readJson(req);
    const canUseDevToken = shouldExposePasswordResetToken();
    const emailConfig = getPasswordResetEmailConfig();
    if (!canUseDevToken) {
      assertPasswordResetEmailConfigured();
    }

    const reset = await createPasswordResetToken(body.email);
    const resetUrl = reset.token ? buildPasswordResetUrl(req, reset.token) : '';

    if (reset.user && reset.token && emailConfig.configured) {
      await sendPasswordResetEmail({
        to: reset.user.email,
        resetUrl,
        expiresAt: reset.expiresAt
      });
    }

    const response = {
      success: true,
      message: GENERIC_RESET_MESSAGE
    };

    if (reset.token && canUseDevToken) {
      response.reset = {
        token: reset.token,
        resetUrl,
        expiresAt: reset.expiresAt
      };
    }

    return json(res, 200, response);
  } catch (error) {
    return handleError(res, error);
  }
}
