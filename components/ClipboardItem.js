import { useState, useEffect } from 'react';
import { FaEdit, FaCheck, FaTimes, FaCopy } from 'react-icons/fa';

export default function ClipboardItem({ index, text, isSelected, onToggleSelect, onRemove, onCopy, onSave, ...props }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(text);
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        setEditedText(text);
    }, [text]);

    const handleSave = () => {
        setIsEditing(false);
        onSave(index, editedText); // Call the onSave function to update the parent state
    };

    const handleCancel = () => {
        setEditedText(text); // Reset to the original text
        setIsEditing(false);
    };

    const handleCopy = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                    onCopy(text);
                })
                .catch((err) => console.error('Failed to copy text: ', err));
        } else {
            console.error('Clipboard API not supported');
        }
    };

    return (
        <>
            <td>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={onToggleSelect}
                />
            </td>
            <td contentEditable={isEditing} suppressContentEditableWarning>
                {isEditing ? (
                    <textarea
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                    />
                ) : (
                    text
                )}
            </td>
            <td>
                {isEditing ? (
                    <>
                        <button onClick={handleSave} title="Save">
                            <FaCheck />
                        </button>
                        <button onClick={handleCancel} title="Cancel">
                            <FaTimes />
                        </button>
                    </>
                ) : (
                    <button onClick={() => setIsEditing(true)} title="Edit">
                        <FaEdit />
                    </button>
                )}
            </td>
            <td>
                <button onClick={handleCopy} title="Copy">
                    {isCopied ? <FaCheck /> : <FaCopy />}
                </button>
            </td>
            <td>
                <button onClick={onRemove} title="Remove">
                    <FaTimes />
                </button>
            </td>
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