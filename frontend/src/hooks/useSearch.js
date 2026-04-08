import { useState, useCallback, useRef } from 'react';

export function useSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Keep a ref to the active AbortController so we can cancel stale requests
  const abortRef = useRef(null);

  const search = useCallback(async (category, q) => {
    if (!category || !q.trim()) return;

    // Cancel any in-flight request before starting a new one
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const res = await fetch(
        `/api/search?category=${category}&q=${encodeURIComponent(q.trim())}`,
        { signal: controller.signal }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error: ${res.status}`);
      }

      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      // AbortError just means a newer search started — not a real error
      if (err.name === 'AbortError') return;
      setError(err.message);
      setResults([]);
    } finally {
      // Only clear loading if this controller is still the active one
      if (abortRef.current === controller) {
        setLoading(false);
      }
    }
  }, []);

  return { results, loading, error, hasSearched, search };
}
