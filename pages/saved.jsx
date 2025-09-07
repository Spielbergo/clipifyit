import { useEffect, useMemo, useState } from 'react';
import { listArticles, getArticle, deleteArticle, saveArticle, hasArticle } from '../lib/offlineDB';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal.component';
import styles from '../styles/saved.module.css';
import { FiTrash2 } from 'react-icons/fi';
import SearchBar from '../components/SearchBar.component';
import SortBar from '../components/SortBar.component';

export default function Saved() {
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installAvailable, setInstallAvailable] = useState(false);
  const [installDebug, setInstallDebug] = useState('');
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [installHelpText, setInstallHelpText] = useState('');
  const [isNarrow, setIsNarrow] = useState(true);
  const [articleModalOpen, setArticleModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // { url, title }
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState('latest'); // 'alpha' | 'descAlpha' | 'oldest' | 'latest'
  const [readUrls, setReadUrls] = useState(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem('saved_read_urls') || '[]';
      return new Set(JSON.parse(raw));
    } catch { return new Set(); }
  });

  async function refresh() {
    try {
      const list = await listArticles();
      setItems(list);
      const u = typeof window !== 'undefined' ? new URL(window.location.href) : null;
      const target = u?.searchParams.get('url');
      if (target) {
        const a = await getArticle(target);
        if (a) setActive(a);
      } else if (!active && list.length) {
        // default to first article for quick read
        const first = await getArticle(list[0].url);
        if (first) setActive(first);
      }

      // Populate excerpts for list items (from IndexedDB only)
      try {
        const details = await Promise.all(
          (list || []).map(async (it) => {
            try {
              const a = await getArticle(it.url);
              const text = a?.html ? extractTextFromHTML(a.html) : (a?.text || '');
              return { url: it.url, excerpt: summarize(text), readMin: computeReadTime(text) };
            } catch { return { url: it.url, excerpt: '', readMin: 0 }; }
          })
        );
        const map = Object.fromEntries(details.map(d => [d.url, d]));
        setItems(prev => (prev || []).map(it => ({
          ...it,
          excerpt: map[it.url]?.excerpt || it.excerpt,
          readMin: typeof map[it.url]?.readMin === 'number' ? map[it.url].readMin : it.readMin
        })));
      } catch {}
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  // Ingest share-target params: ?url=... or ?shareUrl=... or ?shareText=...
  useEffect(() => {
    (async () => {
      try {
        if (typeof window === 'undefined') return;
        const u = new URL(window.location.href);
        const sharedUrl = u.searchParams.get('url') || u.searchParams.get('shareUrl');
        const sharedText = u.searchParams.get('shareText');
        const candidate = (sharedUrl && sharedUrl.trim()) || '';
        const isHttp = /^https?:\/\//i.test(candidate);
        if (isHttp && !(await hasArticle(candidate))) {
          // Fetch server-side reader view and store locally
          const resp = await fetch('/api/offline/fetch-article', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: candidate })
          });
          if (resp.ok) {
            const data = await resp.json();
            await saveArticle({ url: candidate, title: data.title || candidate, html: data.html || '', text: data.text || '' });
            await refresh();
            setActive(await getArticle(candidate));
          }
        } else if (sharedText && /^https?:\/\//i.test(sharedText.trim())) {
          const asUrl = sharedText.trim();
          if (!(await hasArticle(asUrl))) {
            const resp = await fetch('/api/offline/fetch-article', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: asUrl })
            });
            if (resp.ok) {
              const data = await resp.json();
              await saveArticle({ url: asUrl, title: data.title || asUrl, html: data.html || '', text: data.text || '' });
              await refresh();
              setActive(await getArticle(asUrl));
            }
          }
        }
      } catch {}
      finally {
        try {
          const clean = window.location.origin + '/saved';
          window.history.replaceState({}, '', clean);
        } catch {}
      }
    })();
  // We want this to run once on initial load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist read URLs whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem('saved_read_urls', JSON.stringify(Array.from(readUrls))); } catch {}
  }, [readUrls]);

  // Responsive flag for mobile/tablet
  useEffect(() => {
    const onResize = () => setIsNarrow(typeof window !== 'undefined' ? window.innerWidth <= 1280 : true);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Page-only: hide body overflow while /saved is mounted
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Install (Add to Home screen) prompt wiring
  useEffect(() => {
    const mq = typeof window !== 'undefined' ? window.matchMedia('(display-mode: standalone)') : null;
    const standalone = (mq && mq.matches) || (typeof navigator !== 'undefined' && navigator.standalone);
    setIsStandalone(!!standalone);

    function onBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      setInstallAvailable(true);
      setInstallDebug('beforeinstallprompt event fired');
    }
    function onAppInstalled() {
      setDeferredPrompt(null);
      setInstallAvailable(false);
      setIsStandalone(true);
      setInstallDebug('App installed');
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    // Debug: check manifest and SW
    setTimeout(() => {
      if (!window.matchMedia('(display-mode: standalone)').matches && !window.navigator.standalone) {
        if (!window.deferredPrompt) setInstallDebug('No beforeinstallprompt event. PWA may already be installed, or criteria not met.');
      }
    }, 2000);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    try {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        setInstallAvailable(false);
        return;
      }
      // Fallback tips if prompt isn't available
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      setInstallHelpText(
        isIOS
          ? 'To install: Tap the Share button in Safari, then choose "Add to Home Screen".'
          : 'To install: Use your browser menu to Add to Home screen (or the Install option in the address bar).'
      );
      setShowInstallHelp(true);
    } catch {}
  };

  function extractTextFromHTML(html) {
    if (!html) return '';
    try {
      const div = document.createElement('div');
      div.innerHTML = html;
      return (div.textContent || '').trim();
    } catch {
      return '';
    }
  }

  function summarize(text) {
    if (!text) return '';
    const normalized = text.replace(/\s+/g, ' ').trim();
  const max = 120;
  return normalized.length > max ? normalized.slice(0, max) + '…' : normalized;
  }

  function computeReadTime(text) {
    const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
    const wpm = 220; // average reading speed
    if (!words) return 1;
    return Math.max(1, Math.round(words / wpm));
  }

  const openItem = async (url) => {
    const a = await getArticle(url);
    if (a) setActive(a);
    if (isNarrow) setArticleModalOpen(true);
  };

  // Mark current article as read after user scrolls a bit in the content pane
  useEffect(() => {
    if (!active) return;
    // choose scroll container: wide view content pane or modal body
    const container = document.querySelector(`.${styles.content}`) || document.querySelector(`.${styles.mobile_modal_body}`);
    if (!container) return;
    let marked = false;
    const onScroll = () => {
      if (marked) return;
      const threshold = Math.max(120, container.clientHeight * 0.15); // 120px or 15% of view
      if (container.scrollTop > threshold) {
        marked = true;
        setReadUrls(prev => new Set(prev).add(active.url));
      }
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    // Also mark as read if user clicks Next/Previous quickly and scroll is already beyond threshold
    onScroll();
    return () => container.removeEventListener('scroll', onScroll);
  }, [active, isNarrow]);

  const prevArticle = async () => {
    if (!active) return;
    const idx = items.findIndex(it => it.url === active.url);
    if (idx > 0) openItem(items[idx - 1].url);
  };

  const nextArticle = async () => {
    if (!active) return;
  const idx = visibleItems.findIndex(it => it.url === active.url);
  if (idx >= 0 && idx < visibleItems.length - 1) openItem(visibleItems[idx + 1].url);
  };

  const handleDelete = async (url) => {
    await deleteArticle(url);
    if (active?.url === url) setActive(null);
    refresh();
  };

  const visibleItems = useMemo(() => {
    let arr = Array.isArray(items) ? [...items] : [];
    const q = (query || '').trim().toLowerCase();
    if (q) {
      arr = arr.filter((it) => {
        const t = (it?.title || '').toLowerCase();
        const u = (it?.url || '').toLowerCase();
        return t.includes(q) || u.includes(q);
      });
    }
    const getTime = (it) => {
      const t = new Date(it?.savedAt || it?.fetchedAt || 0).getTime();
      return Number.isFinite(t) ? t : 0;
    };
    switch (sortMode) {
      case 'alpha':
        arr.sort((a, b) => (a?.title || a?.url || '').localeCompare(b?.title || b?.url || '', undefined, { sensitivity: 'base' }));
        break;
      case 'descAlpha':
        arr.sort((a, b) => (b?.title || b?.url || '').localeCompare(a?.title || a?.url || '', undefined, { sensitivity: 'base' }));
        break;
      case 'oldest':
        arr.sort((a, b) => getTime(a) - getTime(b));
        break;
      case 'latest':
      default:
        arr.sort((a, b) => getTime(b) - getTime(a));
        break;
    }
    return arr;
  }, [items, query, sortMode]);


  return (
    <main className={styles.saved_main}>
  <div className={`${styles.sidebar} saved_sidebar`}>
        <div className={styles.header_row}>
          <h2 className={styles.title}>Saved Articles</h2>
          {!isStandalone && (
            <button onClick={handleInstall} title="Install app">
              Install
            </button>
          )}
        </div>
        {/* Install tip if not available */}
        {!installAvailable && !isStandalone && (
          <div style={{ color: '#b00', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6, padding: '8px 12px', margin: '8px 0', fontSize: 15 }}>
            <b>Install not available?</b><br />
            Make sure you are using Chrome or Edge, not in Incognito, and have visited this page a few times.<br />
            If you already installed, open the app from your home screen.<br />
            <span style={{ color: '#888', fontSize: 13 }}>Debug: {installDebug}</span>
          </div>
        )}
        <div style={{ padding: '0 0 6px 0' }}>
          <SearchBar value={query} onChange={setQuery} onClear={() => setQuery('')} />
          <SortBar sortMode={sortMode} setSortMode={setSortMode} />
        </div>
        {loading ? 'Loading…' : (
          items.length ? (
            <ul className={styles.list}>
              {visibleItems.length ? visibleItems.map(it => (
                <li key={it.url} className={`${styles.list_item} ${readUrls.has(it.url) ? styles.read : ''}`}>
                  <button className={styles.item_button} onClick={() => openItem(it.url)}>
                    <div className={styles.item_title}>{it.title || it.url}</div>
                    {typeof it.readMin === 'number' && it.readMin > 0 && (
                      <div className={styles.item_date} aria-label="Estimated read time">⏱ {it.readMin} min read</div>
                    )}
                    {it.excerpt ? (
                      <div className={styles.item_excerpt}>{it.excerpt}</div>
                    ) : (
                      <div className={styles.item_date}>{new Date(it.savedAt || Date.now()).toLocaleString()}</div>
                    )}
                  </button>
                  <button className={styles.delete_btn} onClick={() => setConfirmDelete({ url: it.url, title: it.title || it.url })} aria-label="Delete">
                    <FiTrash2 />
                  </button>
                </li>
              )) : (
                <li className={styles.list_item} style={{ justifyContent: 'center', color: '#888' }}>No results.</li>
              )}
            </ul>
          ) : <div>No saved articles found.</div>
        )}
      </div>

      {/* Content pane for wide screens */}
      {!isNarrow && (
        <div className={`${styles.content} saved_sidebar`}>
          {!loading && items.length === 0 && !user ? (
            <div className={styles.promo}>
              <h3 className={styles.promo_title}>Read saved articles, anywhere</h3>
              <p className={styles.promo_text}>
                Upgrade to <strong>Pro</strong> to save article URLs and read them offline in a clean, focused reader.
              </p>
              <ul className={styles.promo_list}>
                <li>Save from your clipboard with one tap</li>
                <li>Install the app and read offline on mobile/desktop</li>
                <li>Articles are stored on this device for quick access</li>
              </ul>
              <div className={styles.promo_actions}>
                <a href="/login"><button>Sign in</button></a>
                <a href="/prices"><button className={styles.primary_btn}>See Pro plans</button></a>
              </div>
            </div>
          ) : active ? (
            <div>
              <h3 className={styles.article_title}>{active.title || 'Saved article'}</h3>
              {(() => {
                const text = active?.html ? extractTextFromHTML(active.html) : (active?.text || '');
                const mins = computeReadTime(text);
                const savedTs = active?.savedAt ? new Date(active.savedAt).toLocaleString() : null;
                return (
                  <div className={styles.item_date} style={{ marginBottom: 6 }}>
                    <span aria-label="Estimated read time">⏱ {mins} min read</span>
                    {savedTs ? <span> • Saved {savedTs}</span> : null}
                  </div>
                );
              })()}
              <div className={styles.article_url}>{active.url}</div>
              {active.html ? (
                <div className={styles.article_reader} dangerouslySetInnerHTML={{ __html: active.html }} />
              ) : (
                <p className={styles.article_text}>{active.text}</p>
              )}
            </div>
          ) : <div className={styles.empty_hint}>Select a saved article to read</div>}
        </div>
      )}
  <Modal open={showInstallHelp} onClose={() => setShowInstallHelp(false)} onPrimary={() => setShowInstallHelp(false)}>
        <div>
          <h3 className={styles.install_title}>Install Clipify It</h3>
          <p className={styles.install_text}>{installHelpText || 'Use your browser’s Install option to add the app to your device.'}</p>
          <div className={styles.install_actions}>
            <button onClick={() => setShowInstallHelp(false)}>Close</button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
  <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onPrimary={async () => { if (confirmDelete?.url) await handleDelete(confirmDelete.url); setConfirmDelete(null); }}>
        <div>
          <h3 className={styles.install_title}>Delete saved article?</h3>
          <p className={styles.install_text}>This will remove the saved copy from this device:</p>
          {confirmDelete?.title ? <p className={styles.install_text}><strong>{confirmDelete.title}</strong></p> : null}
          <div className={styles.install_actions}>
            <button onClick={() => setConfirmDelete(null)}>Cancel</button>
            <button
              className={styles.delete_btn}
              onClick={async () => { if (confirmDelete?.url) await handleDelete(confirmDelete.url); setConfirmDelete(null); }}
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Mobile/Tablet reading modal */}
  <Modal open={isNarrow && articleModalOpen} onClose={() => setArticleModalOpen(false)} onPrimary={() => setArticleModalOpen(false)} hideClose>
        <div className={styles.mobile_modal_container}>
          <div className={styles.mobile_modal_header}>
            <div className={styles.mobile_header_title}>{active?.title || 'Saved article'}</div>
            <button onClick={() => setArticleModalOpen(false)} className={styles.mobile_close_btn} aria-label="Close">Close</button>
          </div>
          <div className={styles.mobile_modal_body}>
            {active ? (
              <>
                {(() => {
                  const text = active?.html ? extractTextFromHTML(active.html) : (active?.text || '');
                  const mins = computeReadTime(text);
                  const savedTs = active?.savedAt ? new Date(active.savedAt).toLocaleString() : null;
                  return (
                    <div className={styles.item_date} style={{ marginBottom: 6 }}>
                      <span aria-label="Estimated read time">⏱ {mins} min read</span>
                      {savedTs ? <span> • Saved {savedTs}</span> : null}
                    </div>
                  );
                })()}
                <div className={styles.article_url}>{active.url}</div>
                {active.html ? (
                  <div className={styles.article_reader} dangerouslySetInnerHTML={{ __html: active.html }} />
                ) : (
                  <p className={styles.article_text}>{active.text}</p>
                )}
              </>
            ) : (
              <div className={styles.empty_hint}>Select a saved article to read</div>
            )}
          </div>
          <div className={styles.mobile_modal_footer}>
            <button onClick={prevArticle} disabled={!active || items.findIndex(it => it.url === active.url) <= 0}>Previous</button>
            <button onClick={nextArticle} disabled={!active || items.findIndex(it => it.url === active.url) >= items.length - 1}>Next</button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
