import { useEffect, useState } from 'react';
import Modal from './Modal.component';
import { listArticles, getArticle, deleteArticle } from '../lib/offlineDB';

export default function SavedArticles({ open, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState(null); // { url, title, text, alts }

  const refresh = async () => {
    try {
      setLoading(true);
      setError('');
      const list = await listArticles();
      setItems(list);
    } catch (e) {
      setError('Failed to load saved articles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    refresh();
  }, [open]);

  const handleOpen = async (url) => {
    try {
      const a = await getArticle(url);
      if (a) setActive(a);
    } catch {}
  };

  const handleDelete = async (url) => {
    try {
      await deleteArticle(url);
      // if deleting currently opened, close it
      if (active?.url === url) setActive(null);
      refresh();
    } catch {}
  };

  return (
    <Modal open={open} onClose={onClose} onPrimary={onClose}>
      <div style={{ display: 'flex', gap: 16, minHeight: 320 }}>
        <div style={{ flex: '0 0 280px', maxHeight: '70vh', overflow: 'auto', borderRight: '1px solid #333', paddingRight: 12 }}>
          <h3 style={{ marginTop: 0 }}>Saved Articles</h3>
          {loading ? <div>Loading…</div> : error ? <div style={{ color: '#ff8a80' }}>{error}</div> : (
            items.length ? (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {items.map((it) => (
                  <li key={it.url} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: '1px solid #2a2a2a', width: '100%', minWidth: 0, overflow: 'hidden' }}>
                    <button onClick={() => handleOpen(it.url)} title="Open" style={{ background: 'none', border: 'none', color: '#ddd', textAlign: 'left', flex: '1 1 auto', minWidth: 0, display: 'block' }}>
                      <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, maxWidth: '100%' }}>{it.title || it.url}</div>
                      <div style={{ fontSize: 12, color: '#999', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{new Date(it.savedAt || it.fetchedAt || Date.now()).toLocaleString()}</div>
                    </button>
                    <button onClick={() => handleDelete(it.url)} title="Delete" style={{ background: '#d32f2f', color: '#fff', flex: '0 0 auto' }}>Delete</button>
                  </li>
                ))}
              </ul>
            ) : (
              <div>No saved articles yet.</div>
            )
          )}
        </div>
        <div style={{ flex: 1, maxHeight: '70vh', overflow: 'auto' }}>
          {active ? (
            <div>
              <h3 style={{ marginTop: 0 }}>{active.title || 'Saved article'}</h3>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>{active.url}</div>
              {active.html ? (
                <div className="article-reader" style={{ lineHeight: 1.6, textAlign: 'left' }} dangerouslySetInnerHTML={{ __html: active.html }} />
              ) : (
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, marginBottom: 10, textAlign: 'left' }}>{active.text}</p>
              )}
              {active.alts?.length ? (
                <details style={{ marginTop: 12 }}>
                  <summary>Image alt text ({active.alts.length})</summary>
                  <ul>
                    {active.alts.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </details>
              ) : null}
              <style jsx>{`
                .article-reader { text-align: left; }
                .article-reader p { margin: 0 0 1em; }
                .article-reader ul, .article-reader ol { padding-left: 1.25rem; margin: 0 0 1em; }
                .article-reader h1, .article-reader h2, .article-reader h3 { margin: 1.2em 0 0.6em; }
                .article-reader pre { background: #111; border: 1px solid #333; border-radius: 6px; padding: 10px; overflow: auto; }
                .article-reader code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
              `}</style>
            </div>
          ) : (
            <div style={{ color: '#888' }}>Select a saved article to preview</div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}
