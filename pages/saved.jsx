import { useEffect, useState } from 'react';
import { listArticles, getArticle } from '../lib/offlineDB';

export default function Saved() {
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const list = await listArticles();
      setItems(list);
      const u = typeof window !== 'undefined' ? new URL(window.location.href) : null;
      const target = u?.searchParams.get('url');
      if (target) {
        const a = await getArticle(target);
        if (a) setActive(a);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  return (
    <main style={{ display: 'flex', gap: 16, padding: 16, minHeight: '80vh' }}>
      <div style={{ flex: '0 0 280px', maxHeight: '80vh', overflow: 'auto', borderRight: '1px solid #333', paddingRight: 12 }}>
        <h2 style={{ marginTop: 0 }}>Saved Articles</h2>
        {loading ? 'Loading…' : (
          items.length ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {items.map(it => (
                <li key={it.url} style={{ padding: '6px 0', borderBottom: '1px solid #2a2a2a' }}>
                  <button onClick={async () => setActive(await getArticle(it.url))} style={{ background: 'none', border: 'none', color: '#ddd', textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }}>
                      {it.title || it.url}
                    </div>
                    <div style={{ fontSize: 12, color: '#999' }}>
                      {new Date(it.savedAt || Date.now()).toLocaleString()}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : <div>No saved articles found.</div>
        )}
      </div>
      <div style={{ flex: 1, maxHeight: '80vh', overflow: 'auto' }}>
        {active ? (
          <div>
            <h3 style={{ marginTop: 0 }}>{active.title || 'Saved article'}</h3>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>{active.url}</div>
            {active.html ? (
              <div className="article-reader" style={{ lineHeight: 1.6, textAlign: 'left' }} dangerouslySetInnerHTML={{ __html: active.html }} />
            ) : (
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, marginBottom: 10, textAlign: 'left' }}>{active.text}</p>
            )}
            <style jsx>{`
              .article-reader { text-align: left; }
              .article-reader p { margin: 0 0 1em; }
              .article-reader ul, .article-reader ol { padding-left: 1.25rem; margin: 0 0 1em; }
              .article-reader h1, .article-reader h2, .article-reader h3 { margin: 1.2em 0 0.6em; }
              .article-reader pre { background: #111; border: 1px solid #333; border-radius: 6px; padding: 10px; overflow: auto; }
            `}</style>
          </div>
        ) : <div style={{ color: '#888' }}>Select a saved article to read</div>}
      </div>
    </main>
  );
}
