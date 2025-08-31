import { useState, useEffect, useRef } from 'react';

import Modal from './Modal.component';
import styles from './controls.module.css';

import { useRouter } from 'next/router';
import { FaSort, FaFolderOpen, FaExpand, FaExternalLinkAlt, FaPaste, FaKeyboard } from 'react-icons/fa';

export default function Controls({ onAddItem, onClearAll, onRedoClear, onHandlePopOut, isPopOut, showErrorNotification, onShowCustomModalChange, selectedProjectId, selectedFolderId, projects = [], folders = [], onSwitchProjectFolder, onSortChange }) {
    const router = typeof window !== 'undefined' ? require('next/router').useRouter() : null;
    const [popOutSize, setPopOutSize] = useState('medium');
    const [errorMessage, setErrorMessage] = useState('');
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [sortMode, setSortMode] = useState('newest');
    // Listen for external sort-mode broadcasts (e.g., 'custom' after manual drag)
    useEffect(() => {
        const handler = (e) => setSortMode(e.detail || 'newest');
        if (typeof window !== 'undefined') window.addEventListener('clipboard-sort-change', handler);
        return () => {
            if (typeof window !== 'undefined') window.removeEventListener('clipboard-sort-change', handler);
        };
    }, []);
    // Notify parent when modal open/close changes
    useEffect(() => {
        if (onShowCustomModalChange) onShowCustomModalChange(showCustomModal);
    }, [showCustomModal, onShowCustomModalChange]);
    const [customText, setCustomText] = useState('');
    const textareaRef = useRef(null);
    // Handle CTRL+V/CMD+V for modal paste
    useEffect(() => {
        if (!showCustomModal) return;
        const handlePaste = async (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
                // Only handle if modal is open and textarea is not focused
                if (textareaRef.current && document.activeElement !== textareaRef.current) {
                    event.preventDefault();
                    try {
                        const text = await navigator.clipboard.readText();
                        setCustomText(prev => prev + text);
                        textareaRef.current.focus();
                    } catch (err) {
                        console.error('Failed to paste into modal:', err);
                    }
                }
            }
        };
        window.addEventListener('keydown', handlePaste);
        return () => window.removeEventListener('keydown', handlePaste);
    }, [showCustomModal]);

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
            const result = await onAddItem(customText.trim());
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

    // Broadcast sort changes so the list can react
    const applySortChange = (mode) => {
        setSortMode(mode);
        if (typeof window !== 'undefined') {
            const ev = new CustomEvent('clipboard-sort-change', { detail: mode });
            window.dispatchEvent(ev);
        }
        if (onSortChange) onSortChange(mode);
    };

    return (
        <div className='controls-container'>
            {/* Popout-only: Project/Folder Switcher */}
            {isPopOut && projects.length > 0 && (
                <ProjectFolderDropdown
                    styles={styles}
                    projects={projects}
                    folders={folders}
                    selectedProjectId={selectedProjectId}
                    selectedFolderId={selectedFolderId}
                    onSwitchProjectFolder={(projId, folderId) => {
                        if (onSwitchProjectFolder) {
                            onSwitchProjectFolder(projId, folderId || '');
                        } else if (router) {
                            const params = [`project=${encodeURIComponent(projId)}`];
                            if (folderId) params.push(`folder=${encodeURIComponent(folderId)}`);
                            window.location.search = '?' + params.join('&');
                        }
                    }}
                />
            )}
            {/* Sort dropdown */}
            <div className={styles.pillWrap}>
                <FaSort className={styles.pillIcon} aria-hidden="true" />
                <select
                    className={styles.pillSelect}
                    aria-label="Sort clipboard items"
                    value={sortMode}
                    onChange={(e) => applySortChange(e.target.value)}
                >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="az">A → Z</option>
                    <option value="za">Z → A</option>
                    <option value="custom">Custom</option>
                </select>
                {/* <FaChevronDown className={styles.pillChevron} aria-hidden="true" /> */}
            </div>
            <div className={styles.popout__container} >
                <div className={styles.pillWrap}>
                    <FaExpand className={styles.pillIcon} aria-hidden="true" />
                    <select
                        className={styles.pillSelect}
                        value={popOutSize}
                        title='Popout window size'
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
                    {/* <FaChevronDown className={styles.pillChevron} aria-hidden="true" /> */}
                </div>
                {!isPopOut && (
                    <button
                        className={styles.pillButton}
                        onClick={() => {
                            if (typeof window !== 'undefined') {
                                let url = '/popout';
                                const params = [];
                                if (selectedProjectId) params.push(`project=${encodeURIComponent(selectedProjectId)}`);
                                if (selectedFolderId) params.push(`folder=${encodeURIComponent(selectedFolderId)}`);
                                if (params.length) url += '?' + params.join('&');
                                window.open(url, '_blank', `width=800,height=600`);
                            } else if (onHandlePopOut) {
                                onHandlePopOut(popOutSize);
                            }
                        }}
                    >
                        <FaExternalLinkAlt className={styles.pillIcon} aria-hidden="true" />
                        Pop Out
                    </button>
                )}
            </div>
            <div className={styles.actionsRow}>
                <button className={styles.pillButton} onClick={() => setShowCustomModal(true)}>
                    <FaKeyboard className={styles.pillIcon} aria-hidden="true" />
                    Paste Custom Text
                </button>
                <button className={styles.pillButton} onClick={handlePaste}>
                    <FaPaste className={styles.pillIcon} aria-hidden="true" />
                    Paste from Clipboard
                </button>
            </div>
            <div className="no-selection-message">{errorMessage}</div>

            <Modal open={showCustomModal} onClose={() => setShowCustomModal(false)} onPrimary={handleAddCustom}>
                <h3 style={{ marginBottom: 12 }}>Paste Custom Text</h3>
                <textarea
                    ref={textareaRef}
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

function ProjectFolderDropdown({ styles, projects, folders, selectedProjectId, selectedFolderId, onSwitchProjectFolder }) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);

    // Close on outside click or ESC
    useEffect(() => {
        const onDocClick = (e) => {
            if (!wrapRef.current) return;
            if (!wrapRef.current.contains(e.target)) setOpen(false);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onKey);
        };
    }, []);

    const currentLabel = (() => {
        if (selectedFolderId) {
            const f = folders.find(ff => String(ff.id) === String(selectedFolderId));
            if (f) return f.name;
        }
        const p = projects.find(pp => String(pp.id) === String(selectedProjectId));
        return p ? p.name : 'Select…';
    })();

    const handleSelectProject = (pid) => {
        onSwitchProjectFolder(pid, '');
        setOpen(false);
    };
    const handleSelectFolder = (fid) => {
        onSwitchProjectFolder(
            (folders.find(f => String(f.id) === String(fid))?.project_id) || selectedProjectId,
            fid
        );
        setOpen(false);
    };

    return (
        <div style={{ marginRight: 16, display: 'inline-block', position: 'relative' }} ref={wrapRef}>
            <div className={styles.pillWrap} role="combobox" aria-expanded={open} aria-haspopup="listbox">
                <FaFolderOpen className={styles.pillIcon} aria-hidden="true" />
                <button
                    type="button"
                    className={styles.pillDropdownTrigger}
                    onClick={() => setOpen(!open)}
                    aria-label="Choose project or folder"
                >
                    {currentLabel}
                </button>
            </div>
            {open && (
                <div className={styles.dropdownMenu} role="listbox">
                    {projects.map(project => (
                        <div key={project.id}>
                            <div
                                role="option"
                                aria-selected={String(project.id) === String(selectedProjectId) && !selectedFolderId}
                                className={`${styles.menuItem} ${styles.menuItemProject}`}
                                onClick={() => handleSelectProject(project.id)}
                            >
                                {project.name}
                            </div>
                            {folders.filter(f => f.project_id === project.id).map(f => (
                                <div
                                    key={f.id}
                                    role="option"
                                    aria-selected={String(f.id) === String(selectedFolderId)}
                                    className={`${styles.menuItem} ${styles.menuItemFolder}`}
                                    onClick={() => handleSelectFolder(f.id)}
                                >
                                    {f.name}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}