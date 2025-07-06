import { useState, useEffect } from 'react';

import Modal from './Modal.component';

import styles from './controls.module.css';

export default function Controls({ onAddItem, onClearAll, onRedoClear, onHandlePopOut, isPopOut, showErrorNotification }) {
    const [popOutSize, setPopOutSize] = useState('medium');
    const [showRedoButton, setShowRedoButton] = useState(false); // Track visibility of the "Redo" button
    const [isRedoDisabled, setIsRedoDisabled] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [customText, setCustomText] = useState('');

    const handleClearAll = () => {
        onClearAll(); // Call the parent-provided clear all function
        setShowRedoButton(true); // Show the "Redo" button
        setIsRedoDisabled(false); // Enable the "Redo" button
    };

    const handleRedoClear = () => {
        onRedoClear(); // Call the parent-provided redo clear function
        setIsRedoDisabled(true); // Disable the "Redo" button
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                if (onAddItem) {
                    // Always check for duplicates by comparing text, regardless of data shape
                    const result = await onAddItem(text);
                    // If onAddItem returns true, it's a duplicate
                    if (result === true) {
                        setErrorMessage("Duplicate content cannot be added!");
                        const errorElement = document.querySelector('.no-selection-message');
                        if (errorElement) {
                            errorElement.style.display = 'block';
                            setTimeout(() => {
                                errorElement.style.display = 'none';
                            }, 2000);
                        }
                        return;
                    }
                }
            }
        } catch (error) {
            console.error("Error pasting clipboard content:", error);
        }
    };

    const handleAddCustom = async () => {
        if (customText.trim()) {
            await onAddItem(customText.trim());
            setCustomText('');
            setShowCustomModal(false);
        }
    };

    const handleResizeWindow = (size) => {
        let width, height;

        switch (size) {
            case 'small':
                width = 400;
                height = 300;
                break;
            case 'large':
                width = 1200;
                height = 800;
                break;
            case 'medium':
            default:
                width = 800;
                height = 600;
                break;
        }

        if (isPopOut) {
            window.resizeTo(width, height);
        }
    };

    useEffect(() => {
        if (isPopOut) {
            handleResizeWindow(popOutSize);
        }
    }, [popOutSize, isPopOut]);

    return (
        <div className='controls-container'>
            <div>
                <button onClick={handleClearAll}>Clear All</button>
                {showRedoButton && (
                    <button
                        onClick={handleRedoClear}
                        disabled={isRedoDisabled}
                        style={{
                            backgroundColor: isRedoDisabled ? 'gray' : '',
                            cursor: isRedoDisabled ? 'not-allowed' : 'pointer',
                        }}
                    >
                        Redo
                    </button>
                )}
            </div>
            <div className={styles.popout__container} >
                <select
                    value={popOutSize}
                    onChange={(e) => {
                        const newSize = e.target.value;
                        setPopOutSize(newSize);
                        if (isPopOut) {
                            handleResizeWindow(newSize);
                        }
                    }}
                >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                </select>
                {!isPopOut && (
                    <button onClick={() => onHandlePopOut(popOutSize)}>Pop Out</button>
                )}
            </div>
            <div>
                <button style={{ marginRight: 8 }} onClick={() => setShowCustomModal(true)}>
                    Paste Custom Text
                </button>
                <button onClick={handlePaste}>Paste from Clipboard</button>
            </div>
            <div className="no-selection-message">{errorMessage}</div>

            <Modal open={showCustomModal} onClose={() => setShowCustomModal(false)}>
                <h3 style={{ marginBottom: 12 }}>Paste Custom Text</h3>
                <textarea
                    value={customText}
                    onChange={e => setCustomText(e.target.value)}
                    rows={4}
                    style={{
                        width: '97%',
                        borderRadius: 4,
                        border: '1px solid #555',
                        padding: 8,
                        marginBottom: 12,
                        background: '#333',
                        color: '#fff'
                    }}
                    placeholder="Type or paste your text here..."
                    autoFocus
                />
                <div className={styles.modal_buttons}>
                    <button onClick={() => setShowCustomModal(false)}>Cancel</button>
                    <button onClick={handleAddCustom} disabled={!customText.trim()}>Add</button>
                </div>
            </Modal>
        </div>
    );
}