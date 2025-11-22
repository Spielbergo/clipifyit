import { useState } from 'react';
import styles from './select-all-action-btn.module.css';

const handleSelectAll = () => {
    const allKeys = displayItems.map((it) => getStableKey(it));
    if (selectedKeys.length > 0) {
        setSelectedKeys([]);
    } else {
        setSelectedKeys(allKeys);
    }
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

export default function SelectAllActionBtn(
    selectedKeys, 
    actionsOpen, 
    handleCopySelected, 
    handleToggleCompleteSelected, 
    openMoveModal, 
    handleSaveSelectedArticles, 
    setConfirmBulkDeleteOpen
) {

    return (
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
    )
}