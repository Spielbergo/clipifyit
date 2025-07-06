import { useState, useEffect } from 'react';
import ClipboardItem from './ClipboardItem';

export default function ClipboardList({
    clipboardItems,
    setClipboardItems,
    onRemoveItem,
    onSaveItem,
    onCopyItem,
    isPro = false, // Pass true for Pro version (Firestore), false for free (localStorage)
}) {
    const [selectedItems, setSelectedItems] = useState([]);
    const [showCopiedMessage, setShowCopiedMessage] = useState(false);
    const [showErrorMessage, setShowErrorMessage] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);

    // Helper to get text for an item (works for both free and pro)
    const getItemText = (item) => (typeof item === 'string' ? item : item.text);

    // Helper to get item id or index
    const getItemKey = (item, index) => (item.id ? item.id : index);

    // Keyboard shortcuts (free version only)
    useEffect(() => {
        if (isPro) return; // Don't handle shortcuts in pro version (Firestore)
        const handleKeyDown = async (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
                // Handle paste shortcut
                try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                        if (clipboardItems.includes(text)) {
                            showErrorNotification('Duplicate content cannot be added!');
                            return;
                        }
                        setClipboardItems([text, ...clipboardItems]);
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

                const itemsToCopy = selectedItems.map((index) => clipboardItems[index]);
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
    }, [clipboardItems, selectedItems, isPro, setClipboardItems]);

    // Drag and drop (free version only)
    const handleDragStart = (index) => {
        if (isPro) return;
        setDraggedIndex(index);
    };

    const handleDragOver = (event) => {
        if (isPro) return;
        event.preventDefault();
    };

    const handleDrop = (index) => {
        if (isPro || draggedIndex === null) return;

        const updatedItems = [...clipboardItems];
        const [draggedItem] = updatedItems.splice(draggedIndex, 1);
        updatedItems.splice(index, 0, draggedItem);

        setClipboardItems(updatedItems);
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

    // Remove item
    const handleRemove = (item, index) => {
        if (onRemoveItem) {
            // Pro version: pass Firestore id
            onRemoveItem(item.id);
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
                    {clipboardItems.map((item, index) => (
                        <tr
                            key={getItemKey(item, index)}
                            draggable={!isPro}
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(index)}
                        >
                            <ClipboardItem
                                index={isPro ? item.id : index}
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
                            <button onClick={handleSelectAll}>
                                {selectedItems.length > 0 ? 'Deselect All' : ' Select All '}
                            </button>
                            <button onClick={handleCopySelected}>Copy Selected</button>
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