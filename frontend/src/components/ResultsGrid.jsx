import ResultCard from './ResultCard';

export default function ResultsGrid({ results, loading, error, hasSearched, category }) {
  if (loading) {
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

  return (
    <div className={`results-grid ${category === 'images' ? 'grid-images' : 'grid-quotes'}`}>
      {results.map(result => (
        <ResultCard key={result.id} result={result} />
      ))}
    </div>
  );
}
