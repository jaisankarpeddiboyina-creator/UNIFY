import { useState, useCallback, useRef } from 'react';

export function useSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Keep a ref to the active AbortController so we can cancel stale requests
  const abortRef = useRef(null);

  const search = useCallback(async (category, q, page = 1) => {
    if (!category) return;

    // Cancel any in-flight request before starting a new one
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setHasSearched(true);
    // Clear results immediately when a new search starts
    if (page === 1) {
      setResults([]);
    }

    try {
      const url = q && q.trim()
        ? `/api/search?category=${category}&q=${encodeURIComponent(q.trim())}&page=${page}`
        : `/api/search?category=${category}&page=${page}`;

      const res = await fetch(url, { signal: controller.signal });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error: ${res.status}`);
      }

      const data = await res.json();
      
      // Append results for page > 1, replace for page 1
      if (page > 1) {
        setResults(prev => [...prev, ...(data.results || [])]);
      } else {
        setResults(data.results || []);
      }
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
