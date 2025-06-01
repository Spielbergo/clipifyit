import { useState, useEffect } from 'react';
import ClipboardItem from './ClipboardItem';

export default function ClipboardList({ clipboardItems, setClipboardItems }) {
    const [selectedItems, setSelectedItems] = useState([]);
    const [showCopiedMessage, setShowCopiedMessage] = useState(false);
    const [showErrorMessage, setShowErrorMessage] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);

    useEffect(() => {
        const handleKeyDown = async (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
                // Handle paste shortcut
                try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                        if (clipboardItems.includes(text)) {
                            // Show error notification for duplicate content
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
    }, [clipboardItems, selectedItems]);

    const handleDragStart = (index) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (event) => {
        event.preventDefault();
    };

    const handleDrop = (index) => {
        if (draggedIndex === null) return;

        const updatedItems = [...clipboardItems];
        const [draggedItem] = updatedItems.splice(draggedIndex, 1);
        updatedItems.splice(index, 0, draggedItem);

        setClipboardItems(updatedItems);
        setDraggedIndex(null);
    };

    const handleToggleSelect = (index) => {
        if (selectedItems.includes(index)) {
            // If the item is already selected, remove it from the selection
            setSelectedItems(selectedItems.filter((i) => i !== index));
        } else {
            // Otherwise, add it to the selection
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

    const handleRemoveItem = (index) => {
        const updatedItems = [...clipboardItems];
        updatedItems.splice(index, 1);
        setClipboardItems(updatedItems);
    };

    const handleCopyToClipboard = (text) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    showCopiedNotification(); // Show success notification
                })
                .catch((err) => {
                    console.error('Failed to copy text: ', err);
                });
        } else {
            console.error('Clipboard API not supported');
        }
    };

    const showCopiedNotification = () => {
        setShowCopiedMessage(true);
        setTimeout(() => {
            setShowCopiedMessage(false);
        }, 2000);
    };

    const showErrorNotification = (message = 'Nothing was selected!') => {
        setShowErrorMessage(message);
        setTimeout(() => {
            setShowErrorMessage(false);
        }, 2000);
    };

    const handleCopySelected = async () => {
        if (selectedItems.length === 0) {
            showErrorNotification();
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
    };

    const handleSaveItem = (index, newText) => {
        const updatedItems = [...clipboardItems];
        updatedItems[index] = newText; // Update the specific item
        setClipboardItems(updatedItems); // Update the state
    };

    return (
        <div>
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
                            key={index}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(index)}
                        >
                            <ClipboardItem
                                index={index}
                                text={item}
                                isSelected={selectedItems.includes(index)}
                                onToggleSelect={() => handleToggleSelect(index)}
                                onRemove={() => handleRemoveItem(index)}
                                onCopy={() => handleCopyToClipboard(item)}
                                onSave={handleSaveItem} // Pass the handleSaveItem function
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