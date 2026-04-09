import { useState, useRef, useEffect } from 'react';

export default function ShareButton({ result }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef(null);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setShowPanel(false);
      }
    }

    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPanel]);

  // Prepare share text based on result type
  const getShareText = () => {
    if (result.imageUrl && result.imageUrl.startsWith('http')) {
      // For images, share the URL
      return result.imageUrl;
    }
    // For quotes/text: "quote text" — author
    const title = result.title || '';
    const author = result.description || '';
    return author ? `"${title}" ${author}` : title;
  };

  const shareUrl = result.url || window.location.href;
  const shareText = getShareText();

  // Platform share handlers
  const copyToClipboard = async () => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        setShowPanel(false);
        return;
      } catch {
        // fall through to fallback
      }
    }

    // Fallback: execCommand
    try {
      const textarea = document.createElement('textarea');
      textarea.value = shareText;
      textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setShowPanel(false);
    } catch {
      setFailed(true);
      setTimeout(() => setFailed(false), 2000);
    }
  };

  const shareOnX = () => {
    const text = encodeURIComponent(`${shareText}\n\nFound on UNIFY`);
    const url = `https://twitter.com/intent/tweet?text=${text}`;
    window.open(url, '_blank', 'width=500,height=400');
    setShowPanel(false);
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(`${shareText}\n\nFound on UNIFY`);
    const url = `https://api.whatsapp.com/send?text=${text}`;
    window.open(url, '_blank');
    setShowPanel(false);
  };

  const shareOnTelegram = () => {
    const text = encodeURIComponent(shareText);
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${text}`;
    window.open(url, '_blank');
    setShowPanel(false);
  };

  const shareViaWeb = async () => {
    if (!navigator.share) {
      copyToClipboard();
      return;
    }

    try {
      await navigator.share({
        title: result.title,
        text: shareText,
        url: shareUrl
      });
      setShowPanel(false);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
      }
    }
  };

  return (
    <div className="share-button-container" ref={panelRef}>
      <button
        className="action-btn"
        onClick={() => setShowPanel(!showPanel)}
        title="Share this result"
      >
        {failed ? '✗ Failed' : copied ? '✓ Copied' : '📤 Share'}
      </button>

      {showPanel && (
        <div className="share-panel">
          <button onClick={copyToClipboard} className="share-option">
            📋 Copy Link
          </button>
          <button onClick={shareOnX} className="share-option">
            🐦 Share on X
          </button>
          <button onClick={shareOnWhatsApp} className="share-option">
            💬 Share on WhatsApp
          </button>
          <button onClick={shareOnTelegram} className="share-option">
            ✈️ Share on Telegram
          </button>
          {navigator.share && (
            <button onClick={shareViaWeb} className="share-option">
              📱 More Options
            </button>
          )}
        </div>
      )}
    </div>
  );
}
