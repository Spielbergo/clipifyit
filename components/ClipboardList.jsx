import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

import ClipboardItem from './ClipboardItem';
import styles from './clipboard-list.module.css';
import Modal from './Modal.component';

export default function ClipboardList({
    clipboardItems,
    setClipboardItems,
    onRemoveItem,
    onSaveItem,
    onCopyItem,
    isPro = false,
    selectedProjectId,
    selectedFolderId,
    showCustomModal = false,
}) {
    const [selectedKeys, setSelectedKeys] = useState([]);
    const [showCopiedMessage, setShowCopiedMessage] = useState(false);
    const [showErrorMessage, setShowErrorMessage] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [sortMode, setSortMode] = useState('newest');
    const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
    const [lastClickedIndex, setLastClickedIndex] = useState(null);

    // New: edit modal state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editText, setEditText] = useState('');
    const editTargetRef = useRef({ item: null, index: -1 });
    // Signal to close inline editor for the item saved via modal
    const [inlineCloseSignal, setInlineCloseSignal] = useState(null);

    const openEditModal = (item, index) => {
        editTargetRef.current = { item, index };
        setEditText(getItemText(item));
        setEditModalOpen(true);
    };
    const closeEditModal = () => {
        setEditModalOpen(false);
        setEditText('');
        editTargetRef.current = { item: null, index: -1 };
    };
    const saveEditModal = () => {
        const { item, index } = editTargetRef.current || {};
        if (item && index >= 0) {
            handleSave(item, index, editText);
            // Ask the matching inline editor (if open) to close
            const key = getStableKey(item);
            setInlineCloseSignal({ key, nonce: Date.now() });
        }
        closeEditModal();
    };

    // Listen for sort changes from Controls
    useEffect(() => {
        const handler = (e) => setSortMode(e.detail || 'newest');
        window.addEventListener('clipboard-sort-change', handler);
        return () => window.removeEventListener('clipboard-sort-change', handler);
    }, []);

    // Get current user from AuthContext
    const { user } = useAuth();
    const currentUserId = user?.id;

    const filteredItems = isPro
    ? clipboardItems.filter(item =>
        item.project_id === selectedProjectId &&
        (selectedFolderId ? item.folder_id === selectedFolderId : !item.folder_id)
    )
    : clipboardItems;

    // Helper to get text for an item (works for both free and pro)
    const getItemText = (item) => (typeof item === 'string' ? item : item.text);

    // Stable key for items (id for pro; text for free where duplicates are prevented)
    const getStableKey = (item) => (typeof item === 'string' ? item : (item.id ?? item.text));

    // React key (prefer stable id/text)
    const getItemKey = (item) => getStableKey(item);

    // Derive sorted view
    const displayItems = useMemo(() => {
        const items = [...filteredItems];
        const getCreated = (it) => {
            const t = it && it.created_at ? new Date(it.created_at).getTime() : null;
            if (Number.isFinite(t)) return t;
            // Fallback to order when created_at is missing
            return Number(it?.order || 0);
        };
        switch (sortMode) {
            case 'newest':
                if (isPro) {
                    return items.sort((a, b) => getCreated(b) - getCreated(a));
                }
                // Free: newest are last in base array; reverse
                return items.slice().reverse();
            case 'oldest':
                if (isPro) {
                    return items.sort((a, b) => getCreated(a) - getCreated(b));
                }
                // Free: base array is oldest-first already
                return items;
            case 'az':
                return items.sort((a, b) => getItemText(a).localeCompare(getItemText(b), undefined, { sensitivity: 'base' }));
            case 'za':
                return items.sort((a, b) => getItemText(b).localeCompare(getItemText(a), undefined, { sensitivity: 'base' }));
            case 'custom':
            default:
                // Use underlying stored order as-is
                return items;
        }
    }, [filteredItems, sortMode, isPro]);

    // Keyboard shortcuts (paste/copy)
    // Use a ref to always get the latest clipboardItems for duplicate check
    const clipboardItemsRef = useRef(clipboardItems);
    useEffect(() => { clipboardItemsRef.current = clipboardItems; }, [clipboardItems]);

    useEffect(() => {
        if (showCustomModal || editModalOpen) return; // Don't handle if any modal is open
        const handleKeyDown = async (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
                // Handle paste shortcut
                try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                        if (clipboardItemsRef.current.some(item => getItemText(item) === text)) {
                            showErrorNotification('Duplicate content cannot be added!');
                            return;
                        }
                        if (isPro) {
                            // Insert into Supabase for Pro
                            const insertObj = {
                                project_id: selectedProjectId,
                                folder_id: selectedFolderId || null,
                                text,
                                created_at: new Date(),
                                order: clipboardItemsRef.current.length,
                                user_id: currentUserId,
                            };
                            const { data, error } = await supabase
                                .from('clipboard_items')
                                .insert([insertObj])
                                .select();
                            if (!error && data) {
                                setClipboardItems(prevItems => [ ...(data || []), ...prevItems ]);
                            }
                        } else {
                            // Free: append to maintain base order (oldest-first)
                            setClipboardItems(prevItems => [...prevItems, text]);
                        }
                    }
                } catch (err) {
                    console.error('Failed to paste from clipboard:', err);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [displayItems, selectedKeys, setClipboardItems, showCustomModal, editModalOpen, isPro, selectedProjectId, selectedFolderId, currentUserId]);

    // Drag and drop across all sort modes; after manual sort switch to 'custom'
    const handleDragStart = (event, index) => {
        try {
            if (event?.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
                // Some browsers require setData to initiate DnD
                event.dataTransfer.setData('text/plain', String(index));
            }
        } catch {}
        setDraggedIndex(index);
    };

    const handleDragOver = (event) => {
        event.preventDefault();
    };

    const handleDrop = async (dropIndex, event) => {
        if (event) {
            try { event.preventDefault(); } catch {}
        }
        if (draggedIndex === null) return;
        // Reorder based on current visible list
        const newDisplayOrder = [...displayItems];
        const [draggedItem] = newDisplayOrder.splice(draggedIndex, 1);
        newDisplayOrder.splice(dropIndex, 0, draggedItem);

    if (isPro) {
            // Persist order so that the top row has the highest order.
            // Compute maxOrder across current list to keep numbers monotonic.
            const currentMax = Math.max(0, ...clipboardItems.map(it => (typeof it === 'string' ? 0 : (Number(it.order) || 0))));
            const base = currentMax + 1; // ensure we move forward
            const size = newDisplayOrder.length;
            await Promise.all(
        newDisplayOrder.map((item, idx) => {
            if (!item || !item.id) return Promise.resolve();
                    const newOrder = base + (size - 1 - idx); // top gets biggest
                    return supabase
                        .from('clipboard_items')
                        .update({ order: newOrder })
                        .eq('id', item.id);
                })
            );

            // Refetch clipboard items for this project/folder after all updates
            let query = supabase
                .from('clipboard_items')
                .select('*')
                .eq('project_id', selectedProjectId)
                .order('order', { ascending: false, nullsLast: true });

            if (selectedFolderId) {
                query = query.eq('folder_id', selectedFolderId);
            } else {
                query = query.is('folder_id', null);
            }

            const { data, error } = await query;
            if (!error) setClipboardItems(data || []);
        } else {
            // Free: capture the new manual order for the full list (no project/folder filter in free)
            setClipboardItems(newDisplayOrder);
        }

        setDraggedIndex(null);
        // Move into custom sort mode and notify controls to sync the dropdown
        setSortMode('custom');
        try {
            const ev = new CustomEvent('clipboard-sort-change', { detail: 'custom' });
            window.dispatchEvent(ev);
        } catch {}
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    // Selection logic using stable keys (works for both) with shift-range support
    const handleToggleSelect = (item, index, event) => {
        const key = getStableKey(item);
        const isChecked = event && typeof event.currentTarget?.checked === 'boolean'
            ? event.currentTarget.checked
            : !selectedKeys.includes(key);
        const isShift = !!event?.shiftKey;

        if (isShift && lastClickedIndex !== null) {
            const start = Math.min(lastClickedIndex, index);
            const end = Math.max(lastClickedIndex, index);
            const rangeKeys = displayItems.slice(start, end + 1).map((it) => getStableKey(it));
            if (isChecked) {
                setSelectedKeys((prev) => Array.from(new Set([...prev, ...rangeKeys])));
            } else {
                setSelectedKeys((prev) => prev.filter((k) => !rangeKeys.includes(k)));
            }
        } else {
            if (isChecked) {
                setSelectedKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
            } else {
                setSelectedKeys((prev) => prev.filter((k) => k !== key));
            }
        }
        setLastClickedIndex(index);
    };

    const handleSelectAll = () => {
        const allKeys = displayItems.map((it) => getStableKey(it));
        if (selectedKeys.length > 0) {
            setSelectedKeys([]);
        } else {
            setSelectedKeys(allKeys);
        }
    };

    // Delete selected items
    const handleDeleteSelected = async () => {
        if (selectedKeys.length === 0) return;
        if (isPro) {
            // Pro: delete from Supabase
            const idsToDelete = displayItems
                .filter(it => selectedKeys.includes(getStableKey(it)))
                .map(it => it.id)
                .filter(Boolean);
            if (idsToDelete.length === 0) return;
            const { error } = await supabase
                .from('clipboard_items')
                .delete()
                .in('id', idsToDelete);
            if (error) {
                console.error('Error deleting items:', error);
            }
            // Refetch clipboard items for this project/folder
            let query = supabase
                .from('clipboard_items')
                .select('*')
                .eq('project_id', selectedProjectId)
                .order('order', { ascending: true, nullsLast: true });
            if (selectedFolderId) {
                query = query.eq('folder_id', selectedFolderId);
            } else {
                query = query.is('folder_id', null);
            }
            const { data, error: fetchError } = await query;
            if (!fetchError) setClipboardItems(data || []);
        } else if (setClipboardItems) {
            // Free: remove by key (text)
            setClipboardItems(clipboardItems.filter(it => !selectedKeys.includes(getStableKey(it))));
        }
        setSelectedKeys([]);
    };

    // Remove single item
    const handleRemove = (item, index) => {
        if (isPro) {
            // Resolve id if missing by matching text in current scope
            let itemId = item?.id;
            if (!itemId) {
                const candidate = clipboardItems.find(it => (
                    (typeof it !== 'string') &&
                    it.text === getItemText(item) &&
                    it.project_id === selectedProjectId &&
                    (selectedFolderId ? it.folder_id === selectedFolderId : !it.folder_id)
                ));
                itemId = candidate?.id;
            }
            if (!itemId) {
                console.warn('Attempted to delete item with no resolvable id:', item);
                return;
            }
            supabase
                .from('clipboard_items')
                .delete()
                .eq('id', itemId)
                .then(({ error }) => {
                    if (error) {
                        console.error('Error deleting item:', error);
                    }
                    // Refetch clipboard items for this project/folder
                    let query = supabase
                        .from('clipboard_items')
                        .select('*')
                        .eq('project_id', selectedProjectId)
                        .order('order', { ascending: false, nullsLast: true });
                    if (selectedFolderId) {
                        query = query.eq('folder_id', selectedFolderId);
                    } else {
                        query = query.is('folder_id', null);
                    }
                    query.then(({ data, error: fetchError }) => {
                        if (!fetchError) setClipboardItems(data || []);
                    });
                });
        } else if (setClipboardItems) {
            // Free: remove by matching text to find original index
            const key = getStableKey(item);
            setClipboardItems(clipboardItems.filter(it => getStableKey(it) !== key));
        }
    };

    // Copy item
    const handleCopy = (item) => {
        const text = getItemText(item);
        if (onCopyItem) {
            onCopyItem(item);
        } else {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text)
                    .then(() => showCopiedNotification())
                    .catch((err) => console.error('Failed to copy text: ', err));
            } else {
                console.error('Clipboard API not supported');
            }
        }
    };

    // Save (edit) item
    const handleSave = (item, index, newText) => {
        if (onSaveItem) {
            onSaveItem(item.id, newText);
        } else if (setClipboardItems) {
            // Free: find original index by key
            const key = getStableKey(item);
            const originalIndex = clipboardItems.findIndex(it => getStableKey(it) === key);
            if (originalIndex >= 0) {
                const updatedItems = [...clipboardItems];
                updatedItems[originalIndex] = newText;
                setClipboardItems(updatedItems);
            }
        }
    };

    // Notifications
    const showCopiedNotification = () => {
        setShowCopiedMessage(true);
        setTimeout(() => setShowCopiedMessage(false), 2000);
    };

    const showErrorNotification = (message = 'Nothing was selected!') => {
        setShowErrorMessage(message);
        setTimeout(() => setShowErrorMessage(false), 2000);
    };

    // Copy selected items
    const handleCopySelected = async () => {
        if (selectedKeys.length === 0) {
            showErrorNotification();
            return;
        }
        const itemsToCopy = displayItems.filter(it => selectedKeys.includes(getStableKey(it))).map(it => getItemText(it));
        const textToCopy = itemsToCopy.join('\n');
        try {
            await navigator.clipboard.writeText(textToCopy);
            showCopiedNotification();
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }
    };

    return (
        <div className={`table-wrapper ${styles.listRoot}`}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Select</th>
                        <th>Text</th>
                        <th>Edit</th>
                        <th>Copy</th>
                        <th>Clear</th>
                        {/* <th>Move</th> */}
                    </tr>
                </thead>
                <tbody>
                    {displayItems.map((item, index) => {
                        const stableKey = getStableKey(item);
                        return (
                        <tr
                            key={getItemKey(item)}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(index, e)}
                            onDragEnd={handleDragEnd}
                        >
                            <ClipboardItem
                                index={index}
                                text={getItemText(item)}
                                isSelected={selectedKeys.includes(stableKey)}
                                onToggleSelect={(e) => handleToggleSelect(item, index, e)}
                                onRemove={() => handleRemove(item, index)}
                                onCopy={() => handleCopy(item)}
                                onSave={(_, newText) => handleSave(item, index, newText)}
                                onExpandEdit={(currentText) => {
                                    // Open modal seeded with the current inline text
                                    editTargetRef.current = { item, index };
                                    setEditText(typeof currentText === 'string' ? currentText : getItemText(item));
                                    setEditModalOpen(true);
                                }}
                                // Close inline editor when modal save happens for this item
                                stableKey={stableKey}
                                inlineCloseSignal={inlineCloseSignal}
                                // Gate offline article features to Pro
                                canOffline={!!isPro}
                            />
                        </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan="6">
                            {selectedKeys.length > 0 ? (
                                <>
                                    <button onClick={handleSelectAll}>Deselect All</button>
                                    <button onClick={handleCopySelected} style={{ marginLeft: 8 }}>Copy Selected</button>
                                    <button onClick={() => setConfirmBulkDeleteOpen(true)} style={{ marginLeft: 8, backgroundColor: '#f44336' }}>Delete Selected</button>
                                </>
                            ) : (
                                <button onClick={handleSelectAll}>Select All</button>
                            )}
                        </td>
                    </tr>
                </tfoot>
            </table>
            {/* Bulk delete confirmation modal */}
            <Modal
                open={confirmBulkDeleteOpen}
                onClose={() => setConfirmBulkDeleteOpen(false)}
                onPrimary={async () => {
                    await handleDeleteSelected();
                    setConfirmBulkDeleteOpen(false);
                }}
            >
                <h3 style={{ marginBottom: 12 }}>Delete selected items?</h3>
                <p style={{ marginBottom: 16 }}>
                    You are about to delete {selectedKeys.length} item{selectedKeys.length === 1 ? '' : 's'}. This action cannot be undone.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={() => setConfirmBulkDeleteOpen(false)}>Cancel</button>
                    <button
                        onClick={async () => {
                            await handleDeleteSelected();
                            setConfirmBulkDeleteOpen(false);
                        }}
                        style={{ backgroundColor: '#d32f2f' }}
                    >
                        Delete
                    </button>
                </div>
            </Modal>

            {/* Edit item modal */}
            <Modal open={editModalOpen} onClose={closeEditModal} onPrimary={saveEditModal}>
                <h3 style={{ marginBottom: 12 }}>Edit clipboard item</h3>
                <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    style={{ width: '100%', minHeight: 180, background: '#1e1e1e', color: '#eee', border: '1px solid #444', borderRadius: 6, padding: 10 }}
                    autoFocus
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                    <button onClick={closeEditModal}>Cancel</button>
                    <button onClick={saveEditModal} style={{ backgroundColor: 'var(--primary-color)', color: '#fff' }}>Save</button>
                </div>
            </Modal>

            <div
                className="copied-message"
                style={{ display: showCopiedMessage ? 'block' : 'none' }}
            >
                Copied to clipboard!
            </div>
            <div
                className="no-selection-message"
                style={{ display: showErrorMessage ? 'block' : 'none' }}
            >
                {showErrorMessage}
            </div>
        </div>
    );
}