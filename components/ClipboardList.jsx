import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { saveArticle, getArticle } from '../lib/offlineDB';

import ClipboardItem from './ClipboardItem';
import styles from './clipboard-list.module.css';
// import SelectAllActionBtn from './SelectAllActionBtn.component';
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
    // Actions dropdown state
    const [actionsOpen, setActionsOpen] = useState(false);
    const actionsBtnRef = useRef(null);
    // Move modal state (Pro only)
    const [moveModalOpen, setMoveModalOpen] = useState(false);
    const [projects, setProjects] = useState([]);
    const [foldersByProject, setFoldersByProject] = useState({});
    const [targetProjectId, setTargetProjectId] = useState(null);
    const [targetFolderId, setTargetFolderId] = useState(null);
    const [isMoving, setIsMoving] = useState(false);
    const [moveError, setMoveError] = useState('');

    // New: edit modal state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editText, setEditText] = useState('');
    // New: optional item name shown in edit modal
    const [editName, setEditName] = useState('');
    // New: optional label color
    const [editLabelColor, setEditLabelColor] = useState('');
    const editTargetRef = useRef({ item: null, index: -1 });
    // Signal to close inline editor for the item saved via modal
    const [inlineCloseSignal, setInlineCloseSignal] = useState(null);
    // Signal rows that certain URLs were saved offline so icons flip immediately
    const [offlineSavedSignal, setOfflineSavedSignal] = useState(null);
    const [bulkSaving, setBulkSaving] = useState(false);
    const [showSavedToast, setShowSavedToast] = useState(false);
    const [savedToastText, setSavedToastText] = useState('');

    // Persisted map of names keyed by stable key (id for Pro, text for Free)
    const [itemNames, setItemNames] = useState({});
    const [itemColors, setItemColors] = useState({});
    const [itemCompleted, setItemCompleted] = useState({});
    useEffect(() => {
        try {
            const raw = localStorage.getItem('clipboard_item_names_v1');
            if (raw) setItemNames(JSON.parse(raw) || {});
            const rawC = localStorage.getItem('clipboard_item_label_colors_v1');
            if (rawC) setItemColors(JSON.parse(rawC) || {});
            const rawD = localStorage.getItem('clipboard_item_completed_v1');
            if (rawD) setItemCompleted(JSON.parse(rawD) || {});
        } catch {}
    }, []);
    useEffect(() => {
        try { localStorage.setItem('clipboard_item_names_v1', JSON.stringify(itemNames || {})); } catch {}
    }, [itemNames]);
    useEffect(() => {
        try { localStorage.setItem('clipboard_item_label_colors_v1', JSON.stringify(itemColors || {})); } catch {}
    }, [itemColors]);
    useEffect(() => {
        try { localStorage.setItem('clipboard_item_completed_v1', JSON.stringify(itemCompleted || {})); } catch {}
    }, [itemCompleted]);

    // Close actions menu on outside click / ESC
    useEffect(() => {
        if (!actionsOpen) return;
        const onDoc = (e) => {
            try {
                if (!actionsBtnRef.current) { setActionsOpen(false); return; }
                if (!actionsBtnRef.current.closest) { setActionsOpen(false); return; }
                const root = actionsBtnRef.current.closest('td') || actionsBtnRef.current;
                if (root && !root.contains(e.target)) setActionsOpen(false);
            } catch { setActionsOpen(false); }
        };
        const onKey = (e) => { if (e.key === 'Escape') setActionsOpen(false); };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
    }, [actionsOpen]);

    const openEditModal = (item, index) => {
        editTargetRef.current = { item, index };
        setEditText(getItemText(item));
        // Seed name/color: Pro reads from row fields with cache fallback; Free reads from local maps
        const key = getStableKey(item);
        if (isPro && typeof item !== 'string') {
            const cached = (itemNames && key in itemNames) ? (itemNames[key] || '') : '';
            setEditName(item?.name ?? cached);
            const cachedColor = (itemColors && key in itemColors) ? (itemColors[key] || '') : '';
            setEditLabelColor(item?.label_color ?? cachedColor ?? '');
        } else {
            setEditName((itemNames && key in itemNames) ? (itemNames[key] || '') : '');
            setEditLabelColor((itemColors && key in itemColors) ? (itemColors[key] || '') : '');
        }
        setEditModalOpen(true);
    };
    const closeEditModal = () => {
        setEditModalOpen(false);
        setEditText('');
        setEditName('');
        setEditLabelColor('');
        editTargetRef.current = { item: null, index: -1 };
    };
    // Toggle completed state from within the edit modal (shared by button and shortcut)
    const handleToggleCompleteFromModal = () => {
        const { item } = editTargetRef.current || {};
        if (!item) return;
        const key = getStableKey(item);

        const isCompleted = (isPro && typeof item !== 'string')
            ? (item.completed ?? ((itemCompleted && key in itemCompleted) ? itemCompleted[key] : false))
            : ((itemCompleted && key in itemCompleted) ? itemCompleted[key] : false);

        const nextVal = !isCompleted;
        // Persist for Pro via DB through onSaveItem convention if available
        if (onSaveItem && item && typeof item !== 'string') {
            onSaveItem(item.id, getItemText(item), undefined, undefined, nextVal);
        }
        // Update caches/UI
        setItemCompleted(prev => ({ ...(prev || {}), [key]: nextVal }));
        if (isPro && typeof item !== 'string') {
            setClipboardItems(prev => prev.map(it => (it.id === item.id ? { ...it, completed: nextVal } : it)));
        }
        // Close any inline editor for this item in the list
        setInlineCloseSignal({ key, nonce: Date.now() });
        setEditModalOpen(false);
    };
    const saveEditModal = () => {
        const { item, index } = editTargetRef.current || {};
        if (item && index >= 0) {
            const trimmedName = (editName || '').trim();
            const chosenColor = (editLabelColor || '').trim();
            handleSave(
                item,
                index,
                editText,
                trimmedName === '' ? null : trimmedName,
                chosenColor === '' ? null : chosenColor
            );
            // Ask the matching inline editor (if open) to close
            const oldKey = getStableKey(item);
            setInlineCloseSignal({ key: oldKey, nonce: Date.now() });
            // Persist name locally as cache for both Free and Pro
            if (typeof trimmedName !== 'undefined') {
                setItemNames(prev => {
                    const next = { ...(prev || {}) };
                    if (typeof item === 'string') {
                        // Free: key is text; re-key to new text
                        delete next[oldKey];
                        if (trimmedName) next[editText] = trimmedName; else delete next[editText];
                    } else {
                        // Pro: id-based; stable key unchanged
                        if (trimmedName) next[oldKey] = trimmedName; else delete next[oldKey];
                    }
                    return next;
                });
            }
            // Persist color locally as cache for both Free and Pro
            if (typeof chosenColor !== 'undefined') {
                setItemColors(prev => {
                    const next = { ...(prev || {}) };
                    if (typeof item === 'string') {
                        delete next[oldKey];
                        if (chosenColor) next[editText] = chosenColor; else delete next[editText];
                    } else {
                        if (chosenColor) next[oldKey] = chosenColor; else delete next[oldKey];
                    }
                    return next;
                });
            }
        }
        closeEditModal();
    };

    // Modal-specific keyboard shortcut: Ctrl/Cmd+M to toggle complete
    useEffect(() => {
        if (!editModalOpen) return;
        const onKey = (e) => {
            try {
                const isCmdOrCtrl = e.metaKey || e.ctrlKey;
                if (isCmdOrCtrl && !e.altKey && !e.shiftKey && (e.key || '').toLowerCase() === 'm') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggleCompleteFromModal();
                }
            } catch {}
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [editModalOpen]);

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

    // URL detection for bulk saved-articles action
    const isLikelyUrl = (v) => {
        const text = ((typeof v === 'string' ? v : getItemText(v)) || '').trim();
        if (!text) return false;
        
        // Handle www. prefixes
        if (text.startsWith('www.')) return true;
        
        // Check for PDF files specifically
        if (/\.pdf(\?|#|$)/i.test(text)) return true;
        
        // More comprehensive URL pattern that handles:
        // - Query parameters (?param=value)
        // - Fragments (#section)
        // - UTM tracking parameters
        // - Port numbers
        // - Various TLDs
        const urlPattern = /^https?:\/\/[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.?[a-zA-Z]{2,}(:[0-9]{1,5})?(\/[^\s]*)?$/i;
        
        return urlPattern.test(text);
    };

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

    // Open move modal: seed defaults to current container
    const openMoveModal = () => {
        if (!isPro) return;
        setMoveError('');
        setTargetProjectId(selectedProjectId || null);
        setTargetFolderId(selectedFolderId || null);
        setMoveModalOpen(true);
    };

    // Load projects for current user when move modal opens (Pro)
    useEffect(() => {
        if (!isPro || !moveModalOpen || !currentUserId) return;
        let cancelled = false;
        (async () => {
            try {
                const { data, error } = await supabase
                    .from('projects')
                    .select('id,name')
                    .eq('user_id', currentUserId)
                    .order('name', { ascending: true });
                if (!cancelled && !error) setProjects(data || []);
            } catch {}
        })();
        return () => { cancelled = true; };
    }, [isPro, moveModalOpen, currentUserId]);

    // Load folders for selected target project when needed
    useEffect(() => {
        if (!isPro || !moveModalOpen || !targetProjectId) return;
        if (foldersByProject[targetProjectId]) return; // cached
        let cancelled = false;
        (async () => {
            try {
                const { data, error } = await supabase
                    .from('folders')
                    .select('id,name,project_id')
                    .eq('project_id', targetProjectId)
                    .order('name', { ascending: true });
                if (!cancelled && !error) {
                    setFoldersByProject(prev => ({ ...(prev || {}), [targetProjectId]: data || [] }));
                }
            } catch {}
        })();
        return () => { cancelled = true; };
    }, [isPro, moveModalOpen, targetProjectId, foldersByProject]);

    // Execute move
    const handleMoveSelected = async () => {
        if (!isPro) return;
        if (!targetProjectId) {
            setMoveError('Please select a target project.');
            return;
        }
        const selectedItems = displayItems.filter(it => selectedKeys.includes(getStableKey(it)));
        const idsToMove = selectedItems.map(it => it?.id).filter(Boolean);
        if (idsToMove.length === 0) {
            setMoveError('Nothing to move.');
            return;
        }
        setIsMoving(true);
        setMoveError('');
        try {
            // Get current max order in the destination container
            let q = supabase
                .from('clipboard_items')
                .select('order')
                .eq('project_id', targetProjectId)
                .order('order', { ascending: false, nullsLast: true })
                .limit(1);
            if (targetFolderId) {
                q = q.eq('folder_id', targetFolderId);
            } else {
                q = q.is('folder_id', null);
            }
            const { data: maxRows } = await q;
            const currentMax = Math.max(0, ...(Array.isArray(maxRows) && maxRows.length > 0 ? [Number(maxRows[0]?.order) || 0] : [0]));

            // Update each item (set project, folder, and bump order so moved items appear on top)
            await Promise.all(idsToMove.map((id, idx) => {
                const newOrder = currentMax + 1 + idx;
                let upd = supabase
                    .from('clipboard_items')
                    .update({ project_id: targetProjectId, folder_id: targetFolderId || null, order: newOrder })
                    .eq('id', id);
                return upd;
            }));

            // Refresh current container list after move
            let refetch = supabase
                .from('clipboard_items')
                .select('*')
                .eq('project_id', selectedProjectId)
                .order('order', { ascending: false, nullsLast: true });
            if (selectedFolderId) {
                refetch = refetch.eq('folder_id', selectedFolderId);
            } else {
                refetch = refetch.is('folder_id', null);
            }
            const { data: refreshed, error: fetchErr } = await refetch;
            if (!fetchErr && Array.isArray(refreshed) && setClipboardItems) {
                setClipboardItems(refreshed);
            }
            setSelectedKeys([]);
            setMoveModalOpen(false);
        } catch (e) {
            setMoveError(e?.message || 'Failed to move items.');
        } finally {
            setIsMoving(false);
        }
    };

    // Drag and drop across all sort modes; after manual sort switch to 'custom'
    const handleDragStart = (event, index) => {
        try {
            if (event?.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
                // Some browsers require setData to initiate DnD
                event.dataTransfer.setData('text/plain', String(index));
                // Provide a richer payload for cross-project/folder moves (Pro only)
                try {
                    if (isPro) {
                        const draggedItem = displayItems[index];
                        const draggedKey = getStableKey(draggedItem);
                        // If multiple selected and includes the dragged row, move the whole selection; otherwise just the dragged row
                        const keys = (selectedKeys && selectedKeys.includes(draggedKey)) ? selectedKeys.slice() : [draggedKey];
                        // Map keys to ids (filter out any without ids)
                        const ids = keys
                            .map(k => {
                                const it = displayItems.find(ii => getStableKey(ii) === k) || clipboardItems.find(ii => getStableKey(ii) === k);
                                return (it && typeof it !== 'string') ? it.id : null;
                            })
                            .filter(Boolean);
                        const payload = {
                            ids,
                            sourceProjectId: selectedProjectId || null,
                            sourceFolderId: selectedFolderId || null,
                        };
                        event.dataTransfer.setData('application/x-clipify-ids', JSON.stringify(payload));
                    }
                } catch {}
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
        // Remove names for deleted items
        setItemNames(prev => {
            const next = { ...(prev || {}) };
            for (const k of selectedKeys) delete next[k];
            return next;
        });
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
            const nameKey = getStableKey(item);
            supabase
                .from('clipboard_items')
                .delete()
                .eq('id', itemId)
                .then(({ error }) => {
                    if (error) {
                        console.error('Error deleting item:', error);
                    }
                    // Remove any cached name for this item
                    setItemNames(prev => {
                        const next = { ...(prev || {}) };
                        delete next[nameKey];
                        return next;
                    });
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
            // Also drop stored name for this item
            setItemNames(prev => {
                const next = { ...(prev || {}) };
                delete next[key];
                return next;
            });
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
    const handleSave = (item, index, newText, newName, newLabelColor) => {
        if (onSaveItem) {
            // Pro path: update text and optionally name in DB
            onSaveItem(item.id, newText, newName, newLabelColor);
        } else if (setClipboardItems) {
            // Free: find original index by key
            const key = getStableKey(item);
            const originalIndex = clipboardItems.findIndex(it => getStableKey(it) === key);
            if (originalIndex >= 0) {
                const updatedItems = [...clipboardItems];
                updatedItems[originalIndex] = newText;
                setClipboardItems(updatedItems);
                // Optionally persist name in local map for Free
        if (typeof newName !== 'undefined') {
                    setItemNames(prev => {
                        const next = { ...(prev || {}) };
                        // Re-key if the text changed (key is text)
                        delete next[key];
            if (newName) next[newText] = newName; else delete next[newText];
                        return next;
                    });
                }
                // Optionally persist label color in local map for Free
        if (typeof newLabelColor !== 'undefined') {
                    setItemColors(prev => {
                        const next = { ...(prev || {}) };
                        delete next[key];
            if (newLabelColor) next[newText] = newLabelColor; else delete next[newText];
                        return next;
                    });
                }
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

    const showSavedNotification = (count) => {
        const plural = count === 1 ? '' : 's';
        setSavedToastText(`Saved ${count} article${plural} for offline`);
        setShowSavedToast(true);
        setTimeout(() => setShowSavedToast(false), 2000);
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

    // Bulk save selected URL items as offline articles (Pro only)
    const handleSaveSelectedArticles = async () => {
        if (!isPro) return;
        if (selectedKeys.length === 0) { showErrorNotification(); return; }
        const items = displayItems.filter(it => selectedKeys.includes(getStableKey(it)));
        if (items.length === 0) return;
        // Ensure all are URLs (guard; menu should already hide otherwise)
        const allUrls = items.every(it => isLikelyUrl(getItemText(it)));
        if (!allUrls) { showErrorNotification('Only URL items can be saved.'); return; }

        setBulkSaving(true);
        try {
            const savedUrls = [];
            for (const it of items) {
                const raw = getItemText(it);
                const url = raw.startsWith('http') ? raw : `https://${raw}`;
                try {
                    const cached = await getArticle(url);
                    if (cached) { savedUrls.push(url); continue; }
                    const resp = await fetch('/api/offline/fetch-article', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url })
                    });
                    const json = await resp.json();
                    if (!resp.ok) throw new Error(json?.error || 'Fetch failed');
                    const article = { url, title: json.title, text: json.text, html: json.html || null, alts: json.alts || [], fetchedAt: json.fetchedAt };
                    await saveArticle(article);
                    savedUrls.push(url);
                } catch (e) {
                    // Continue with others; optionally log
                    try { console.warn('Save article failed for', url, e); } catch {}
                }
            }
            if (savedUrls.length > 0) {
                setOfflineSavedSignal({ urls: savedUrls, nonce: Date.now() });
                showSavedNotification(savedUrls.length);
            }
        } finally {
            setBulkSaving(false);
            setActionsOpen(false);
        }
    };

    // Bulk toggle complete for selected items (Pro updates DB; Free updates local cache)
    const handleToggleCompleteSelected = async () => {
        if (selectedKeys.length === 0) {
            showErrorNotification();
            return;
        }
        const items = displayItems.filter(it => selectedKeys.includes(getStableKey(it)));
        if (items.length === 0) return;
        // Determine target state: if any not completed -> complete all; else mark all active
        const anyNotCompleted = items.some(it => {
            const key = getStableKey(it);
            const isCompleted = (isPro && typeof it !== 'string')
                ? (it.completed ?? ((itemCompleted && key in itemCompleted) ? itemCompleted[key] : false))
                : ((itemCompleted && key in itemCompleted) ? itemCompleted[key] : false);
            return !isCompleted;
        });
        const nextVal = anyNotCompleted; // true if any not completed, else false

        // Update caches/UI immediately
        setItemCompleted(prev => {
            const next = { ...(prev || {}) };
            for (const it of items) {
                const key = getStableKey(it);
                next[key] = nextVal;
            }
            return next;
        });
        if (isPro) {
            // Update local list row objects
            setClipboardItems(prev => prev.map(row => {
                const key = getStableKey(row);
                if (selectedKeys.includes(key) && typeof row !== 'string') {
                    return { ...row, completed: nextVal };
                }
                return row;
            }));
            // Persist to DB via onSaveItem convention
            if (onSaveItem) {
                await Promise.all(
                    items
                        .map(it => (typeof it !== 'string' ? it : null))
                        .filter(Boolean)
                        .map(it => onSaveItem(it.id, getItemText(it), undefined, undefined, nextVal))
                );
            }
        }
    };

    return (
        <div className={`table-wrapper ${styles.listRoot}`}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Select</th>
                        <th>Text</th>
                        {/* <th>Edit</th>
                        <th>Copy</th>
                        <th>Clear</th> */}
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
                                name={(isPro && typeof item !== 'string') ? ((item.name ?? ((itemNames && stableKey in itemNames) ? itemNames[stableKey] : '')) || '') : ((itemNames && stableKey in itemNames) ? itemNames[stableKey] : '')}
                                labelColor={(isPro && typeof item !== 'string') ? ((item.label_color ?? ((itemColors && stableKey in itemColors) ? itemColors[stableKey] : '')) || '') : ((itemColors && stableKey in itemColors) ? itemColors[stableKey] : '')}
                                completed={(isPro && typeof item !== 'string') ? (item.completed ?? ((itemCompleted && stableKey in itemCompleted) ? itemCompleted[stableKey] : false)) : ((itemCompleted && stableKey in itemCompleted) ? itemCompleted[stableKey] : false)}
                                isSelected={selectedKeys.includes(stableKey)}
                                onToggleSelect={(e) => handleToggleSelect(item, index, e)}
                                onRemove={() => handleRemove(item, index)}
                                onCopy={() => handleCopy(item)}
                                onSave={(_, newText) => handleSave(item, index, newText)}
                                onExpandEdit={(currentText) => {
                                    // Open modal seeded with the current inline text
                                    editTargetRef.current = { item, index };
                                    setEditText(typeof currentText === 'string' ? currentText : getItemText(item));
                                    const key = getStableKey(item);
                                    if (isPro && typeof item !== 'string') {
                                        const cached = (itemNames && key in itemNames) ? (itemNames[key] || '') : '';
                                        setEditName(item?.name ?? cached);
                                        const cachedColor = (itemColors && key in itemColors) ? (itemColors[key] || '') : '';
                                        setEditLabelColor(item?.label_color ?? cachedColor ?? '');
                                    } else {
                                        setEditName((itemNames && key in itemNames) ? (itemNames[key] || '') : '');
                                        setEditLabelColor((itemColors && key in itemColors) ? (itemColors[key] || '') : '');
                                    }
                                    setEditModalOpen(true);
                                }}
                                // Close inline editor when modal save happens for this item
                                stableKey={stableKey}
                                inlineCloseSignal={inlineCloseSignal}
                                        offlineSavedSignal={offlineSavedSignal}
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
                                <div className={styles.actionsRow}>
                                    <button onClick={handleSelectAll}>Deselect All</button>
                                    <div className={styles.actionsDropdownWrap}>
                                        <button ref={actionsBtnRef} onClick={() => setActionsOpen(v => !v)}>
                                            Actions ▾
                                        </button>
                                        {actionsOpen && (
                                            <div className={styles.actionsDropdown}>
                                                <button onClick={() => { setActionsOpen(false); handleCopySelected(); }}>Copy selected</button>
                                                <button onClick={() => { setActionsOpen(false); handleToggleCompleteSelected(); }}>
                                                    {(() => {
                                                        const items = displayItems.filter(it => selectedKeys.includes(getStableKey(it)));
                                                        const anyNotCompleted = items.some(it => {
                                                            const key = getStableKey(it);
                                                            const isCompleted = (isPro && typeof it !== 'string')
                                                                ? (it.completed ?? ((itemCompleted && key in itemCompleted) ? itemCompleted[key] : false))
                                                                : ((itemCompleted && key in itemCompleted) ? itemCompleted[key] : false);
                                                            return !isCompleted;
                                                        });
                                                        return anyNotCompleted ? 'Mark as complete' : 'Mark as active';
                                                    })()}
                                                </button>
                                                {isPro && (
                                                    <button onClick={() => { setActionsOpen(false); openMoveModal(); }}>Move selected…</button>
                                                )}
                                                {(() => {
                                                    if (!isPro) return null;
                                                    const items = displayItems.filter(it => selectedKeys.includes(getStableKey(it)));
                                                    const allUrls = items.length > 0 && items.every(it => isLikelyUrl(getItemText(it)));
                                                    if (!allUrls) return null;
                                                    return (
                                                        <button disabled={bulkSaving} onClick={() => { handleSaveSelectedArticles(); }}>
                                                            {bulkSaving ? 'Saving…' : 'Save selected articles'}
                                                        </button>
                                                    );
                                                })()}
                                                <button onClick={() => { setActionsOpen(false); setConfirmBulkDeleteOpen(true); }} className={styles.dropdownDeleteButton}>Delete selected</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
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
                <h3 className={styles.modalHeading}>Delete selected items?</h3>
                <p className={styles.modalParagraph}>
                    You are about to delete {selectedKeys.length} item{selectedKeys.length === 1 ? '' : 's'}. This action cannot be undone.
                </p>
                <div className={styles.flexEndRow}>
                    <button onClick={() => setConfirmBulkDeleteOpen(false)}>Cancel</button>
                    <button
                        onClick={async () => {
                            await handleDeleteSelected();
                            setConfirmBulkDeleteOpen(false);
                        }}
                        className={styles.dangerButton}
                    >
                        Delete
                    </button>
                </div>
            </Modal>

            {/* Move selected items modal (Pro only) */}
            {isPro && (
                <Modal
                    open={moveModalOpen}
                    onClose={() => setMoveModalOpen(false)}
                    onPrimary={handleMoveSelected}
                >
                    <h3 className={styles.modalHeading}>Move {selectedKeys.length} item{selectedKeys.length === 1 ? '' : 's'}</h3>
                    <div className={styles.moveForm}>
                        <label className={styles.formLabel}>
                            <span>Project</span>
                            <select
                                value={targetProjectId || ''}
                                onChange={(e) => {
                                    const pid = e.target.value || null;
                                    setTargetProjectId(pid);
                                    // Reset folder selection on project change
                                    setTargetFolderId(null);
                                }}
                                className={styles.formSelect}
                            >
                                <option value="" disabled>Select a project…</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name || 'Untitled'}</option>
                                ))}
                            </select>
                        </label>
                        <label className={styles.formLabel}>
                            <span>Folder (optional)</span>
                            <select
                                value={targetFolderId || ''}
                                onChange={(e) => setTargetFolderId(e.target.value || null)}
                                disabled={!targetProjectId}
                                className={styles.formSelect}
                            >
                                <option value="">No folder</option>
                                {(foldersByProject[targetProjectId] || []).map(f => (
                                    <option key={f.id} value={f.id}>{f.name || 'Untitled folder'}</option>
                                ))}
                            </select>
                        </label>
                        {moveError ? (
                            <div className={styles.formError}>{moveError}</div>
                        ) : null}
                    </div>
                    <div className={`${styles.flexEndRow} ${styles.mt16}`}>
                        <button onClick={() => setMoveModalOpen(false)}>Cancel</button>
                        <button onClick={handleMoveSelected} disabled={isMoving} className={styles.primaryButton}>
                            {isMoving ? 'Moving…' : 'Move'}
                        </button>
                    </div>
                </Modal>
            )}

            {/* Edit item modal */}
            <Modal open={editModalOpen} onClose={closeEditModal} onPrimary={saveEditModal}>
                <h3 className={styles.modalHeading}>Edit clipboard item</h3>
                {/* Name + Label Color */}
                <div className={styles.editTopRow}>
                    <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Name (optional)"
                        className={styles.formInput}
                        style={{ flex: 1 }}
                    />
                    <select
                        value={editLabelColor}
                        onChange={(e) => setEditLabelColor(e.target.value)}
                        title="Label color"
                        className={styles.formSelect}
                        style={{ minWidth: 140 }}
                    >
                        <option value="">Default</option>
                        <option value="blue">Blue</option>
                        <option value="green">Green</option>
                        <option value="purple">Purple</option>
                        <option value="orange">Orange</option>
                        <option value="red">Red</option>
                        <option value="gray">Gray</option>
                    </select>
                </div>
                <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className={styles.editTextarea}
                    autoFocus
                />
                <div className={styles.editFooterRow}>
                    <div>
                        {(() => {
                            const { item } = editTargetRef.current || {};
                            const key = item ? getStableKey(item) : null;
                            const isCompleted = item ? ((isPro && typeof item !== 'string') ? (item.completed ?? ((itemCompleted && key in itemCompleted) ? itemCompleted[key] : false)) : ((itemCompleted && key in itemCompleted) ? itemCompleted[key] : false)) : false;
                            return (
                <button onClick={handleToggleCompleteFromModal} title={(isCompleted ? 'Mark as active' : 'Mark as complete') + ' (Ctrl/Cmd+M)'}>
                                    {isCompleted ? 'Mark as active' : 'Mark as complete'}
                                </button>
                            );
                        })()}
                    </div>
                    <div className={styles.editFooterActions}>
                        <button onClick={closeEditModal}>Cancel</button>
                        <button onClick={saveEditModal} className={styles.primaryButton}>Save</button>
                    </div>
                </div>
            </Modal>

            <div
                className={`copied-message ${showCopiedMessage ? styles.visible : ''}`}
            >
                Copied to clipboard!
            </div>
            <div
                className={`no-selection-message ${showErrorMessage ? styles.visible : ''}`}
            >
                {showErrorMessage}
            </div>
            <div
                className={`copied-message ${showSavedToast ? styles.visible : ''}`}
            >
                {savedToastText}
            </div>
        </div>
    );
}