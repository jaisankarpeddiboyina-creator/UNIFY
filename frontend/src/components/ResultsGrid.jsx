import { useState } from 'react';
import ResultCard from './ResultCard';

export default function ResultsGrid({ results, loading, error, hasSearched, category, currentPage = 1, onShowMore }) {
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const handleShowMore = async () => {
    if (onShowMore && isLoadingMore === false) {
      setIsLoadingMore(true);
      try {
        await onShowMore(currentPage + 1);
      } finally {
        setIsLoadingMore(false);
      }
    }
  };

  if (loading && currentPage === 1) {
    return <div className="state-message">Searching...</div>;
  }

  if (error) {
    return <div className="state-message error">Something went wrong. Try again.</div>;
  }

  // Before the user has searched at all
  if (!hasSearched) {
    return <div className="state-message">Search something to get started.</div>;
  }

  // Searched but nothing came back
  if (results.length === 0) {
    return <div className="state-message">No results found. Try a different search.</div>;
  }

  const showMore = results.length >= 3 && onShowMore;

  return (
    <>
      <div className={`results-grid ${category === 'images' ? 'grid-images' : 'grid-quotes'}`}>
        {results.map(result => (
          <ResultCard key={result.id} result={result} />
        ))}
      </div>
      {showMore && (
        <div className="results-footer">
          <button
            className="show-more-btn"
            onClick={handleShowMore}
            disabled={isLoadingMore || loading}
          >
            {isLoadingMore ? 'Loading more...' : '📥 Show More'}
          </button>
        </div>
      )}
    </>
  );
}
