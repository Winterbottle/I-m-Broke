'use client';
import { useEffect } from 'react';

/**
 * Silently pings the backend health endpoint as soon as the app loads.
 * This wakes up the Render server so subsequent API calls are fast.
 */
export default function ApiWarmup() {
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_API_URL;
    if (url) {
      fetch(`${url}/health`, { method: 'GET' }).catch(() => {});
    }
  }, []);

  return null;
}
