import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ResultsGrid from '../components/ResultsGrid';
import ErrorBoundary from '../components/ErrorBoundary';
import { useSearch } from '../hooks/useSearch';
import '../index.css';

export default function App() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [query, setQuery] = useState('');
  const [categoriesError, setCategoriesError] = useState(false);
  const { results, loading, error, hasSearched, search } = useSearch();

  useEffect(() => {
    fetch('/api/categories')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setCategories(data);
        setSelectedCategory(data[0]?.id || null);
      })
      .catch(err => {
        console.error('Failed to load categories:', err);
        setCategoriesError(true);
      });
  }, []);

  const handleSearch = (q) => {
    setQuery(q);
    if (selectedCategory) search(selectedCategory, q);
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    if (query) search(categoryId, query);
  };

  if (categoriesError) {
    return (
      <div className="app-error">
        <p>Could not load UNIFY. Please refresh the page.</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app">
        <Navbar onSearch={handleSearch} />
        <div className="layout">
          <Sidebar
            categories={categories}
            selected={selectedCategory}
            onSelect={handleCategorySelect}
          />
          <main className="content">
            <ResultsGrid
              results={results}
              loading={loading}
              error={error}
              hasSearched={hasSearched}
              category={selectedCategory}
            />
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
