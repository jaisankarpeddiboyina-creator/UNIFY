export default function DownloadButton({ result }) {
  const downloadAs = (format) => {
    let content, mimeType, ext;

    if (format === 'json') {
      content = JSON.stringify(result, null, 2);
      mimeType = 'application/json';
      ext = 'json';
    } else {
      content = [
        result.title,
        result.description || '',
        result.source ? `Source: ${result.source}` : '',
        result.url ? `Link: ${result.url}` : '',
        result.imageUrl ? `Image: ${result.imageUrl}` : ''
      ].filter(Boolean).join('\n');
      mimeType = 'text/plain';
      ext = 'txt';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.category}-${result.id}.${ext}`;

    // Must be in the DOM for Firefox to trigger the download
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="download-group">
      <button className="action-btn" onClick={() => downloadAs('json')} title="Download as JSON">
        ⬇ JSON
      </button>
      <button className="action-btn" onClick={() => downloadAs('txt')} title="Download as TXT">
        ⬇ TXT
      </button>
    </div>
  );
}
