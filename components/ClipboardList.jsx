import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

import ClipboardItem from './ClipboardItem';

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
    const [selectedItems, setSelectedItems] = useState([]);
    const [showCopiedMessage, setShowCopiedMessage] = useState(false);
    const [showErrorMessage, setShowErrorMessage] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);

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

    // Helper to get item id or index
    const getItemKey = (item, index) => (item.id ? item.id : index);

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

            if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
                // Handle copy shortcut
                if (selectedItems.length === 0) {
                    showErrorNotification('No items selected to copy!');
                    return;
                }

                const itemsToCopy = selectedItems.map((index) => getItemText(clipboardItems[index]));
                const textToCopy = itemsToCopy.join('\n');
                try {
                    await navigator.clipboard.writeText(textToCopy);
                    showCopiedNotification();
                } catch (err) {
                    console.error('Failed to copy to clipboard:', err);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [clipboardItems, selectedItems, setClipboardItems, showCustomModal]);

    // Drag and drop (free version only)
    const handleDragStart = (index) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (event) => {
        event.preventDefault();
    };

    const handleDrop = async (dropIndex) => {
        if (draggedIndex === null) return;

        // Work with a copy of the filtered items
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
            // Find the indexes of filteredItems in allItems
            const filteredIndexes = filteredItems.map(fItem => allItems.findIndex(aItem => aItem.id === fItem.id));
            // Remove filteredItems from allItems
            let reordered = allItems.filter((item, idx) => !filteredIndexes.includes(idx));
            // Find where to insert the reordered filteredItems
            let insertAt = allItems.findIndex(item => item.id === filteredItems[0]?.id);
            if (insertAt === -1) insertAt = reordered.length;
            // Insert updatedFiltered at the correct position
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
                // If not found, append at the end
                insertAt = updated.length;
            }
            // Insert reordered filteredItems back at the correct position
            updated = [
                ...updated.slice(0, insertAt),
                ...updatedFiltered,
                ...updated.slice(insertAt)
            ];
            setClipboardItems(updated);
        }

        setDraggedIndex(null);
    };

    // Selection logic (works for both)
    const handleToggleSelect = (index) => {
        if (selectedItems.includes(index)) {
            setSelectedItems(selectedItems.filter((i) => i !== index));
        } else {
            setSelectedItems([...selectedItems, index]);
        }
    };


    const handleSelectAll = () => {
        if (selectedItems.length > 0) {
            setSelectedItems([]);
        } else {
            setSelectedItems(clipboardItems.map((_, index) => index));
        }
    };

    // Delete selected items
    const handleDeleteSelected = async () => {
        if (selectedItems.length === 0) return;
        if (isPro) {
            // Pro: delete from Supabase
            const idsToDelete = selectedItems.map(index => clipboardItems[index].id).filter(Boolean);
            console.log('Attempting to delete IDs:', idsToDelete);
            const { data: deleteData, error } = await supabase
                .from('clipboard_items')
                .delete()
                .in('id', idsToDelete);
            if (error) {
                console.error('Error deleting items:', error);
            } else {
                console.log('Delete result:', deleteData);
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
            console.log('Items after delete:', data);
            if (!fetchError) setClipboardItems(data || []);
        } else if (setClipboardItems) {
            // Free: remove by index
            setClipboardItems(clipboardItems.filter((_, idx) => !selectedItems.includes(idx)));
        }
        setSelectedItems([]);
    };

    // Remove item
    const handleRemove = (item, index) => {
        if (isPro) {
            // Pro: delete from Supabase
            if (!item.id) {
                console.warn('Attempted to delete item with no id:', item);
                return;
            }
            console.log('Attempting to delete ID:', item.id);
            supabase
                .from('clipboard_items')
                .delete()
                .eq('id', item.id)
                .then(({ data: deleteData, error }) => {
                    if (error) {
                        console.error('Error deleting item:', error);
                    } else {
                        console.log('Delete result:', deleteData);
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
                        console.log('Items after delete:', data);
                        if (!fetchError) setClipboardItems(data || []);
                    });
                });
        } else if (setClipboardItems) {
            // Free version: remove by index
            const updatedItems = [...clipboardItems];
            updatedItems.splice(index, 1);
            setClipboardItems(updatedItems);
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
            // Pro version: pass Firestore id
            onSaveItem(item.id, newText);
        } else if (setClipboardItems) {
            // Free version: update by index
            const updatedItems = [...clipboardItems];
            updatedItems[index] = newText;
            setClipboardItems(updatedItems);
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
        if (selectedItems.length === 0) {
            showErrorNotification();
            return;
        }
        const itemsToCopy = selectedItems.map((index) => getItemText(clipboardItems[index]));
        const textToCopy = itemsToCopy.join('\n');
        try {
            await navigator.clipboard.writeText(textToCopy);
            showCopiedNotification();
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }
    };

    return (
        <div className="table-wrapper">
            <table>
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
                    {filteredItems.map((item, index) => (
                        <tr
                            key={getItemKey(item, index)}
                            draggable={true}
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(index)}
                        >
                            <ClipboardItem
                                index={index}
                                text={getItemText(item)}
                                isSelected={selectedItems.includes(index)}
                                onToggleSelect={() => handleToggleSelect(index)}
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
                            {selectedItems.length > 0 ? (
                                <>
                                    <button onClick={handleSelectAll}>Deselect All</button>
                                    <button onClick={handleDeleteSelected} style={{ marginLeft: 8, backgroundColor: '#f44336' }}>Delete Selected</button>
                                </>
                            ) : (
                                <button onClick={handleSelectAll}>Select All</button>
                            )}
                            <button onClick={handleCopySelected} style={{ marginLeft: 8 }}>Copy Selected</button>
                        </td>
                    </tr>
                </tfoot>
            </table>
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