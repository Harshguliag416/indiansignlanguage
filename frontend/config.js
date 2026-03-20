const trimTrailingSlash = (value) => value.replace(/\/+$/, '');
const PRODUCTION_FALLBACK_BACKEND_URLS = [
  'https://isl-bridge-backend-ol16.onrender.com',
  'https://isl-bridge-backend.onrender.com',
];

const unique = (values) => [...new Set(values.filter(Boolean))];

const resolveBackendUrls = () => {
  const explicitUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  if (explicitUrl) {
    return [trimTrailingSlash(explicitUrl)];
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return ['http://127.0.0.1:5000'];
    }
  }

  return unique(PRODUCTION_FALLBACK_BACKEND_URLS.map(trimTrailingSlash));
};

export const BACKEND_URL_CANDIDATES = resolveBackendUrls();
export const BACKEND_URL = BACKEND_URL_CANDIDATES[0] || '';
export const HAS_BACKEND_URL = BACKEND_URL_CANDIDATES.length > 0;
