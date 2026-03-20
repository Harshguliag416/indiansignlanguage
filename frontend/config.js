const trimTrailingSlash = (value) => value.replace(/\/+$/, '');
const PRODUCTION_FALLBACK_BACKEND_URL = 'https://isl-bridge-backend.onrender.com';

const resolveBackendUrl = () => {
  const explicitUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  if (explicitUrl) {
    return trimTrailingSlash(explicitUrl);
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://127.0.0.1:5000';
    }

    return PRODUCTION_FALLBACK_BACKEND_URL;
  }

  return PRODUCTION_FALLBACK_BACKEND_URL;
};

export const BACKEND_URL = resolveBackendUrl();
export const HAS_BACKEND_URL = Boolean(BACKEND_URL);
