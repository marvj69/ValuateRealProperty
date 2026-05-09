import { ensureSchema, sql } from './db.js';
import { HttpError } from './http.js';

const USER_SETTING_DEFINITIONS = Object.freeze({
  model: {
    defaultValue: 'gemini-flash-lite-latest',
    allowedValues: ['gemini-flash-lite-latest', 'gemini-flash-latest']
  },
  reportAudience: {
    defaultValue: 'seller',
    allowedValues: ['buyer', 'seller', 'investor']
  },
  promptKey: {
    defaultValue: 'experimental',
    allowedValues: ['standard', 'experimental']
  }
});

function jsonParam(value) {
  return JSON.stringify(value);
}

function pickSettingsPayload(input = {}) {
  if (input?.settings && typeof input.settings === 'object' && !Array.isArray(input.settings)) {
    return input.settings;
  }
  return input && typeof input === 'object' && !Array.isArray(input) ? input : {};
}

export function normalizeUserSettings(input = {}, { partial = false, strict = false } = {}) {
  const rawSettings = pickSettingsPayload(input);

  return Object.entries(USER_SETTING_DEFINITIONS).reduce((settings, [key, definition]) => {
    const value = rawSettings[key];
    if (value === undefined || value === null || value === '') {
      if (!partial) settings[key] = definition.defaultValue;
      return settings;
    }

    if (!definition.allowedValues.includes(value)) {
      if (strict) {
        throw new HttpError(400, `Unsupported value for ${key}.`, {
          field: key,
          allowedValues: definition.allowedValues
        });
      }
      if (!partial) settings[key] = definition.defaultValue;
      return settings;
    }

    settings[key] = value;
    return settings;
  }, {});
}

export function completeUserSettings(settings = {}) {
  return {
    ...normalizeUserSettings({}, { partial: false }),
    ...normalizeUserSettings(settings, { partial: true })
  };
}

export async function getSettingsForUser(user) {
  await ensureSchema();

  const { rows } = await sql`
    SELECT settings
    FROM app_users
    WHERE id = ${user.userId}
    LIMIT 1
  `;

  if (!rows[0]) {
    throw new HttpError(401, 'Authentication required.');
  }

  return completeUserSettings(rows[0].settings || {});
}

export async function updateSettingsForUser(user, input) {
  await ensureSchema();

  const settingsPatch = normalizeUserSettings(input, { partial: true, strict: true });
  if (Object.keys(settingsPatch).length === 0) {
    return getSettingsForUser(user);
  }

  const { rows } = await sql`
    UPDATE app_users
    SET
      settings = settings || ${jsonParam(settingsPatch)}::jsonb,
      updated_at = now()
    WHERE id = ${user.userId}
    RETURNING settings
  `;

  if (!rows[0]) {
    throw new HttpError(401, 'Authentication required.');
  }

  return completeUserSettings(rows[0].settings || {});
}
