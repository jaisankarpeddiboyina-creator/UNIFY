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
  const [currentPage, setCurrentPage] = useState(1);
  const { results, loading, error, hasSearched, search } = useSearch();

  // Load categories on mount
  useEffect(() => {
    fetch('/api/categories')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setCategories(data);
        // Auto-load first category with its defaultQuery
        if (data.length > 0) {
          setSelectedCategory(data[0].id);
          // Use defaultQuery for auto-load
          if (data[0].defaultQuery) {
            search(data[0].id, data[0].defaultQuery, 1);
            setCurrentPage(1);
          }
        }
      })
      .catch(err => {
        console.error('Failed to load categories:', err);
        setCategoriesError(true);
      });
  }, [search]);

  const handleSearch = (q) => {
    setQuery(q);
    setCurrentPage(1); // Reset to page 1 on new search
    if (selectedCategory) search(selectedCategory, q, 1);
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setQuery(''); // Clear the search input when switching categories
    setCurrentPage(1); // Reset pagination
    
    // Auto-load the category with its defaultQuery
    const category = categories.find(c => c.id === categoryId);
    if (category && category.defaultQuery) {
      search(categoryId, category.defaultQuery, 1);
    }
  };

  const handleShowMore = async (nextPage) => {
    // Load next page with current query or category's defaultQuery
    const searchQuery = query || categories.find(c => c.id === selectedCategory)?.defaultQuery || '';
    await search(selectedCategory, searchQuery, nextPage);
    setCurrentPage(nextPage);
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
              currentPage={currentPage}
              onShowMore={handleShowMore}
            />
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
