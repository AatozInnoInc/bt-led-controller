import { useEffect, useState } from 'react';

interface Props {
  open: boolean;
  code: string;
  onClose(): void;
}

export function CodeExportModal({ open, code, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open)
      setCopied(false);
  }, [open]);

  useEffect(() => {
    if (!open)
      return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')
        onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore — user can still hand-select the textarea
    }
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Generated Arduino code"
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2 className="modal-title">Arduino C++</h2>
          <button className="btn-secondary" type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <pre className="code-block" tabIndex={0}>
          <code>{code}</code>
        </pre>
        <footer className="modal-footer">
          <span className="modal-hint">Paste into <code>bt-led-controller.ino</code> next to the other pattern functions.</span>
          <button className="btn-primary" type="button" onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </footer>
      </div>
    </div>
  );
}
