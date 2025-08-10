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
        switch (sortMode) {
            case 'oldest':
                return items.slice().reverse();
            case 'az':
                return items.sort((a, b) => getItemText(a).localeCompare(getItemText(b), undefined, { sensitivity: 'base' }));
            case 'za':
                return items.sort((a, b) => getItemText(b).localeCompare(getItemText(a), undefined, { sensitivity: 'base' }));
            case 'newest':
            default:
                return items; // keep existing order
        }
    }, [filteredItems, sortMode]);

    // Keyboard shortcuts (paste/copy)
    // Use a ref to always get the latest clipboardItems for duplicate check
    const clipboardItemsRef = useRef(clipboardItems);
    useEffect(() => { clipboardItemsRef.current = clipboardItems; }, [clipboardItems]);

    useEffect(() => {
        if (showCustomModal) return; // Don't handle if modal is open
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
                            // Free: just update local state
                            setClipboardItems(prevItems => [text, ...prevItems]);
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
    }, [displayItems, selectedKeys, setClipboardItems, showCustomModal, isPro, selectedProjectId, selectedFolderId, currentUserId]);

    // Drag and drop (free version only) — only when sort is default
    const handleDragStart = (index) => {
        if (sortMode !== 'newest') return;
        setDraggedIndex(index);
    };

    const handleDragOver = (event) => {
        if (sortMode !== 'newest') return;
        event.preventDefault();
    };

    const handleDrop = async (dropIndex) => {
        if (sortMode !== 'newest') return;
        if (draggedIndex === null) return;

        // Work with a copy of the filtered items (default order)
        const updatedFiltered = [...filteredItems];
        const [draggedItem] = updatedFiltered.splice(draggedIndex, 1);
        updatedFiltered.splice(dropIndex, 0, draggedItem);

        if (isPro) {
            // Pro version: update order for ALL items in the current project/folder
            // 1. Get all items for this project/folder
            let allQuery = supabase
                .from('clipboard_items')
                .select('*')
                .eq('project_id', selectedProjectId);
            if (selectedFolderId) {
                allQuery = allQuery.eq('folder_id', selectedFolderId);
            } else {
                allQuery = allQuery.is('folder_id', null);
            }
            const { data: allItems, error: allError } = await allQuery;
            if (allError) {
                console.error('Failed to fetch all items for drag-and-drop:', allError);
                setDraggedIndex(null);
                return;
            }

            // 2. Build the reordered list
            const filteredIndexes = filteredItems.map(fItem => allItems.findIndex(aItem => aItem.id === fItem.id));
            let reordered = allItems.filter((item, idx) => !filteredIndexes.includes(idx));
            let insertAt = allItems.findIndex(item => item.id === filteredItems[0]?.id);
            if (insertAt === -1) insertAt = reordered.length;
            reordered = [
                ...reordered.slice(0, insertAt),
                ...updatedFiltered,
                ...reordered.slice(insertAt)
            ];

            // 3. Update order for all items in reordered list
            await Promise.all(
                reordered.map((item, idx) =>
                    supabase
                        .from('clipboard_items')
                        .update({ order: idx })
                        .eq('id', item.id)
                )
            );

            // 4. Refetch clipboard items for this project/folder after all updates
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

            const { data, error } = await query;
            if (!error) setClipboardItems(data || []);
        } else {
            // Free version: update local state only
            // Remove all filteredItems from clipboardItems
            let updated = clipboardItems.filter(item => !filteredItems.some(f => getItemText(f) === getItemText(item)));
            // Find the index of the first filtered item in clipboardItems
            let insertAt = clipboardItems.findIndex(i => getItemText(i) === getItemText(filteredItems[0]));
            if (insertAt === -1) {
                insertAt = updated.length;
            }
            updated = [
                ...updated.slice(0, insertAt),
                ...updatedFiltered,
                ...updated.slice(insertAt)
            ];
            setClipboardItems(updated);
        }

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
            if (!item.id) {
                console.warn('Attempted to delete item with no id:', item);
                return;
            }
            supabase
                .from('clipboard_items')
                .delete()
                .eq('id', item.id)
                .then(({ error }) => {
                    if (error) {
                        console.error('Error deleting item:', error);
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
                    {displayItems.map((item, index) => (
                        <tr
                            key={getItemKey(item)}
                            draggable={sortMode === 'newest'}
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(index)}
                        >
                            <ClipboardItem
                                index={index}
                                text={getItemText(item)}
                                isSelected={selectedKeys.includes(getStableKey(item))}
                                onToggleSelect={(e) => handleToggleSelect(item, index, e)}
                                onRemove={() => handleRemove(item, index)}
                                onCopy={() => handleCopy(item)}
                                onSave={(idOrIndex, newText) => handleSave(item, index, newText)}
                            />
                        </tr>
                    ))}
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
            <Modal open={confirmBulkDeleteOpen} onClose={() => setConfirmBulkDeleteOpen(false)}>
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