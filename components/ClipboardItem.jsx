import { useState, useEffect } from 'react';
import { FaEdit, FaCheck, FaTimes, FaCopy } from 'react-icons/fa';

export default function ClipboardItem({
    index,
    text,
    isSelected,
    onToggleSelect,
    onRemove,
    onCopy,
    onSave,
    ...props
}) {
    const safeText = typeof text === 'string' ? text : (text ? String(text) : '');
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(safeText);
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        setEditedText(safeText);
    }, [safeText]);

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
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                    if (onCopy) onCopy(text);
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

    function isColor(str) {
        // Hex
        if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(str.trim())) return true;
        // rgb/rgba
        if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(,\s*(0|1|0?\.\d+))?\s*\)$/i.test(str.trim())) return true;
        // hsl/hsla
        if (/^hsla?\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?(,\s*(0|1|0?\.\d+))?\s*\)$/i.test(str.trim())) return true;
        // Named colors (basic set)
        if (
            [
            'red','blue','green','yellow','orange','purple','pink','black','white','gray','grey','brown','cyan','magenta','lime','maroon','navy','olive','teal','aqua','fuchsia','silver','gold'
            ].includes(str.trim().toLowerCase())
        ) return true;
        return false;
    }

    return (
        <>
            <td>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={onToggleSelect}
                />
            </td>
            <td
                style={
                    !isEditing && isColor(safeText)
                    ? { color: safeText.trim(), fontWeight: '500' }
                    : {}
                }
            >
                {isEditing ? (
                    <textarea
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        style={{ width: '97%' }}
                    />
                ) : (
                    <span style={{ whiteSpace: 'pre-wrap' }}>{linkify(safeText)}</span>
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