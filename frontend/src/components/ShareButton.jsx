import { useState } from 'react';

export default function ShareButton({ result }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const share = async () => {
    const text = result.imageUrl
      ? result.imageUrl
      : `"${result.title}" ${result.description}`;

    // navigator.clipboard requires HTTPS — fallback for HTTP / old browsers
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch {
        // fall through to execCommand fallback
      }
    }

    // Fallback: create a temporary textarea and use execCommand
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFailed(true);
      setTimeout(() => setFailed(false), 2000);
    }
  };

  return (
    <button className="action-btn" onClick={share} title="Copy to clipboard">
      {failed ? '✗ Failed' : copied ? '✓ Copied' : '📤 Share'}
    </button>
  );
}
