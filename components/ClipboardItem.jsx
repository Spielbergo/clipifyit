import { useState, useEffect } from 'react';
import { FaEdit, FaCheck, FaTimes, FaCopy } from 'react-icons/fa';
import { FiDownload, FiBookOpen } from 'react-icons/fi';
import Modal from './Modal.component';
import Loader from './Loader.component';
import { saveArticle, getArticle, hasArticle } from '../lib/offlineDB';

export default function ClipboardItem({
    index,
    text,
    isSelected,
    onToggleSelect,
    onRemove,
    onCopy,
    onSave,
    onExpandEdit,
    stableKey,
    inlineCloseSignal,
    canOffline = false,
    ...props
}) {
    const safeText = typeof text === 'string' ? text : (text ? String(text) : '');
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(safeText);
    const [isCopied, setIsCopied] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
    const [articleState, setArticleState] = useState({ has: false, loading: false, data: null, error: '' });
    const [showSavedMessage, setShowSavedMessage] = useState(false);

    useEffect(() => {
        setEditedText(safeText);
    }, [safeText]);

    useEffect(() => {
        if (!inlineCloseSignal || !stableKey) return;
        if (inlineCloseSignal.key === stableKey) {
            setIsEditing(false);
        }
    }, [inlineCloseSignal, stableKey]);

    const handleSave = () => {
        setIsEditing(false);
        if (onSave) {
            onSave(index, editedText);
        }
    };

    const handleCancel = () => {
        setEditedText(text);
        setIsEditing(false);
    };

    const handleCopy = () => {
        if (onCopy) {
            onCopy(text);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
            return;
        }
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                })
                .catch((err) => console.error('Failed to copy text: ', err));
        } else {
            console.error('Clipboard API not supported');
        }
    };

    function linkify(str) {
        const urlRegex = /((https?:\/\/|www\.)[^\s]+)/g;
        const parts = [];
        let lastIndex = 0;
        let match;
        let key = 0;

        while ((match = urlRegex.exec(str)) !== null) {
            // Add text before the link
            if (match.index > lastIndex) {
                parts.push(str.substring(lastIndex, match.index));
            }
            // Add the link
            let url = match[0];
            let href = url.startsWith('http') ? url : `https://${url}`;
            parts.push(
                <a
                    key={key++}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#1976d2', wordBreak: 'break-all' }}
                    title='Open link in new tab'
                >
                    {url}
                </a>
            );
            lastIndex = match.index + url.length;
        }
        // Add any remaining text
        if (lastIndex < str.length) {
            parts.push(str.substring(lastIndex));
        }
        return parts;
    }

    function resolveCssColor(str) {
        const v = (str || '').trim();
        if (!v) return null;
        if (typeof window === 'undefined') return null;
        const s = new Option().style; // lightweight CSS parser
        s.color = '';
        s.color = v;
        return s.color ? v : null;
    }

    const isLikelyUrl = (v) => /^(https?:\/\/|www\.)\S+$/i.test((v||'').trim());

    async function handleDownloadArticle() {
        const url = safeText.startsWith('http') ? safeText : `https://${safeText}`;
        setArticleState(s => ({ ...s, loading: true, error: '' }));
        try {
            // Check cache first
            const cached = await getArticle(url);
            if (cached) {
                setArticleState({ has: true, loading: false, data: cached, error: '' });
                setIsArticleModalOpen(true);
                return;
            }
            // Fetch from server to avoid CORS
            const resp = await fetch('/api/offline/fetch-article', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            const json = await resp.json();
            if (!resp.ok) throw new Error(json?.error || 'Fetch failed');
            const article = { url, title: json.title, text: json.text, html: json.html || null, alts: json.alts || [], fetchedAt: json.fetchedAt };
            await saveArticle(article);
            setArticleState({ has: true, loading: false, data: article, error: '' });
            // Success notification only; do not auto-open reader
            setShowSavedMessage(true);
            setTimeout(() => setShowSavedMessage(false), 2000);
        } catch (e) {
            setArticleState(s => ({ ...s, loading: false, error: e.message || 'Failed to save article' }));
        }
    }

    useEffect(() => {
        let mounted = true;
        (async () => {
            if (isLikelyUrl(safeText)) {
                try {
                    const url = safeText.startsWith('http') ? safeText : `https://${safeText}`;
                    const exists = await hasArticle(url);
                    if (mounted) setArticleState(s => ({ ...s, has: exists }));
                } catch {}
            }
        })();
        return () => { mounted = false; };
    }, [safeText]);

    return (
        <>
            <td>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onClick={onToggleSelect}
                    readOnly
                />
            </td>
            <td>
                {isEditing ? (
                    <textarea
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        style={{ width: '97%', color: confirmRemove ? '#888' : undefined, textDecoration: confirmRemove ? 'line-through' : undefined, opacity: confirmRemove ? 0.6 : 1 }}
                    />
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {resolveCssColor(safeText) ? (
                            <span
                                title={safeText.trim()}
                                aria-label={`color ${safeText.trim()}`}
                                style={{
                                    display: 'inline-block',
                                    width: 16,
                                    height: 16,
                                    borderRadius: 4,
                                    border: '1px solid #ccc',
                                    background: safeText.trim(),
                                    flex: '0 0 auto'
                                }}
                            />
                        ) : null}
                        <span style={{ whiteSpace: 'pre-wrap', color: confirmRemove ? '#888' : undefined, textDecoration: confirmRemove ? 'line-through' : undefined, opacity: confirmRemove ? 0.6 : 1, flex: 1 }}>{linkify(safeText)}</span>
                        {/* Inline right offline button for URL (Pro only) */}
                        {canOffline && isLikelyUrl(safeText) && (
                            <button
                                onClick={handleDownloadArticle}
                                title={articleState.loading ? 'Saving…' : (articleState.has ? 'Read saved article' : 'Save for offline')}
                                aria-busy={articleState.loading}
                                disabled={articleState.loading}
                            >
                                {articleState.loading ? (
                                    <Loader size={16} />
                                ) : articleState.has ? (
                                    <FiBookOpen />
                                ) : (
                                    <FiDownload />
                                )}
                            </button>
                        )}
                    </div>
                )}
            </td>
            {/* Edit, Copy, Remove buttons in a flex row, with Remove confirmation overlayed */}
            <td colSpan={3} style={{ position: 'relative', minWidth: 160 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-start' }}>
                    {/* Edit button */}
                    {!isEditing && !confirmRemove && (
                        <button onClick={() => setIsEditing(true)} title="Edit">
                            <FaEdit />
                        </button>
                    )}
                    {/* Offline action moved to left edge inside text cell */}
                    {/* Save/Cancel + Expand buttons while editing */}
                    {isEditing && (
                        <>
                            <button onClick={handleSave} title="Save">
                                <FaCheck />
                            </button>
                            <button onClick={handleCancel} title="Cancel">
                                <FaTimes />
                            </button>
                            <button onClick={() => onExpandEdit && onExpandEdit(editedText)} title="Expand editor">
                                ⤢
                            </button>
                        </>
                    )}
                    {/* Copy button */}
                    {!isEditing && !confirmRemove && (
                        <button onClick={handleCopy} title="Copy">
                            {isCopied ? <FaCheck /> : <FaCopy />}
                        </button>
                    )}
                    {/* Remove button or confirmation overlay */}
                    {!isEditing && !confirmRemove && (
                        <button onClick={() => setConfirmRemove(true)} title="Remove">
                            <FaTimes />
                        </button>
                    )}
                </div>
                {/* Confirmation overlay, positioned absolutely over the button row */}
                {confirmRemove && (
                    <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 2, borderRadius: 4 }}>
                        <button onClick={() => { setConfirmRemove(false); onRemove(); }} title="Confirm Remove" style={{ background: '#d32f2f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FaCheck />
                        </button>
                        <button onClick={() => setConfirmRemove(false)} title="Cancel" style={{ background: '#888', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FaTimes />
                        </button>
                    </div>
                )}
                {/* Offline reader modal */}
                <Modal open={isArticleModalOpen} onClose={() => setIsArticleModalOpen(false)}>
                    {articleState.loading ? (
                        <div>Fetching…</div>
                    ) : articleState.error ? (
                        <div style={{ color: '#ff8a80' }}>{articleState.error}</div>
                    ) : articleState.data ? (
                        <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
                            <h3 style={{ marginTop: 0 }}>{articleState.data.title || 'Saved article'}</h3>
                            {articleState.data.html ? (
                                <div className="article-reader" style={{ lineHeight: 1.6, textAlign: 'left' }} dangerouslySetInnerHTML={{ __html: articleState.data.html }} />
                            ) : (
                                <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, textAlign: 'left' }}>{articleState.data.text}</p>
                            )}
                            {articleState.data.alts?.length ? (
                                <details style={{ marginTop: 12 }}>
                                    <summary>Image alt text ({articleState.data.alts.length})</summary>
                                    <ul>
                                        {articleState.data.alts.map((a, i) => <li key={i}>{a}</li>)}
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
                        <div>No content saved yet.</div>
                    )}
                </Modal>
            </td>
            {/* Success popup notification for saved article */}
            <div
                className="copied-message"
                style={{ display: showSavedMessage ? 'block' : 'none' }}
            >
                Saved for offline!
            </div>
            {/* <td>
                <span
                    style={{ cursor: 'grab' }}
                    title="Drag to reorder"
                >
                    ⋮⋮
                </span>
            </td> */}
        </>
    );
}