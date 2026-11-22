export function isRegistrationEnabled(nodeEnv = process.env.NODE_ENV) {
  return nodeEnv === 'development';
}
