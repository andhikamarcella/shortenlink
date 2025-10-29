const BLOCKED_PROTOCOLS = ['javascript:', 'data:', 'vbscript:'];

export function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }
    if (BLOCKED_PROTOCOLS.includes(url.protocol)) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}

export function sanitizeUrl(value: string) {
  return value.trim();
}
