/**
 * Credenciales locales (sin backend). También puedes usar en build:
 * REACT_APP_AUTH_EMAIL y REACT_APP_AUTH_PASSWORD (.env).
 */
export const AUTH_EMAIL = 'contacto@rki.com';
export const AUTH_PASSWORD = 'Guagua2016';

/** Correos válidos (p. ej. dominio anterior tras cambio a @rki.com). */
export const AUTH_EMAIL_ALIASES = [
  'contacto@rki.com',
  'contacto@recorriendokilometros.com.mx'
];

export const SESSION_KEY = 'rk_sistema_session';

export function getAuthConfig() {
  const primaryEmail = (process.env.REACT_APP_AUTH_EMAIL || AUTH_EMAIL).trim().toLowerCase();
  const password = process.env.REACT_APP_AUTH_PASSWORD || AUTH_PASSWORD;
  const emails = [...new Set([primaryEmail, ...AUTH_EMAIL_ALIASES.map((e) => e.trim().toLowerCase())])];
  return { emails, password };
}
