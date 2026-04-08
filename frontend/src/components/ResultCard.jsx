import DownloadButton from './DownloadButton';
import ShareButton from './ShareButton';

export default function ResultCard({ result }) {
  const isImage = !!result.imageUrl;

  return (
    <div className={`result-card ${isImage ? 'card-image' : 'card-quote'}`}>

      {isImage && (
        <>
          <div className="card-img-wrap">
            <img
              src={result.imageUrl}
              alt={result.title || 'Search result image'}
              loading="lazy"
              onError={e => {
                // Avoid infinite loop if fallback also fails
                e.target.onerror = null;
                e.target.src = `https://picsum.photos/seed/${encodeURIComponent(result.id)}/400/300`;
              }}
            />
          </div>
          <div className="card-body">
            <p className="card-title">{result.title}</p>
            <span className="card-source">{result.source}</span>
            <div className="card-actions">
              <DownloadButton result={result} />
              <ShareButton result={result} />
            </div>
          </div>
        </>
      )}

      {!isImage && (
        <div className="card-body">
          <blockquote className="card-quote-text">"{result.title}"</blockquote>
          {result.description && (
            <p className="card-quote-author">{result.description}</p>
          )}
          <span className="card-source">{result.source}</span>
          <div className="card-actions">
            <DownloadButton result={result} />
            <ShareButton result={result} />
          </div>
        </div>
      )}

    </div>
  );
}
