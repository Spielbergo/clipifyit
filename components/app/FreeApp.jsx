import { useState, useEffect } from 'react';
import ClipboardList from '../ClipboardList';
import Controls from '../Controls';
import FreeSidebar from '../FreeSidebar';
import { useRouter } from 'next/router';

export default function FreeApp() {
    const [clipboardItems, setClipboardItems] = useState([]);
    const [clearedItems, setClearedItems] = useState([]);
    const [showErrorMessage, setShowErrorMessage] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const storedItems = JSON.parse(localStorage.getItem('clipboardItems')) || [];
        setClipboardItems(storedItems);
    }, []);

    useEffect(() => {
        localStorage.setItem('clipboardItems', JSON.stringify(clipboardItems));
    }, [clipboardItems]);

    // Android PWA share-target ingestion for Free mode as well
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const url = new URL(window.location.href);
        const params = url.searchParams;
        const shareText = params.get('shareText');
        const shareUrl = params.get('shareUrl');
        const shareTitle = params.get('shareTitle');
        const payload = shareText || shareUrl || shareTitle;
        if (!payload) return;
        handleAddItem(payload);
        // Clean query so it doesn't repeat
        router.replace('/app', undefined, { shallow: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleAddItem = (text) => {
        if (clipboardItems.includes(text)) {
            return true;
        }
    setClipboardItems([...clipboardItems, text]);
        return false;
    };

    const showErrorNotification = (message) => {
        setShowErrorMessage(message);
        setTimeout(() => setShowErrorMessage(false), 2000);
    };

    const handleClearAll = () => {
        setClearedItems([...clipboardItems]);
        setClipboardItems([]);
    };

    const handleRedoClear = () => {
        setClipboardItems([...clearedItems]);
        setClearedItems([]);
    };

    const handlePopOut = (size) => {
        let width, height;
        switch (size) {
            case 'small': width = 400; height = 300; break;
            case 'large': width = 1200; height = 800; break;
            case 'medium':
            default: width = 800; height = 600; break;
        }
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        const popOutUrl = `${window.location.origin}/popout`;
        window.open(
            popOutUrl,
            '_blank',
            `width=${width},height=${height},left=${left},top=${top},resizable,scrollbars`
        );
    };

    const openSavedArticles = () => {
        router.push('/saved');
    };

    return (
        <div className="app-main">
            
            <FreeSidebar />

            <div className="app-wrapper">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', margin: '24px 0 12px 0', gap: 12 }}>
                    <h2 style={{ margin: 0, fontWeight: 600, fontSize: 24, textAlign: 'left' }}>Clipify It Free</h2>
                    <button onClick={openSavedArticles} title="View saved articles" style={{ alignSelf: 'flex-start' }}>
                        Saved Articles
                    </button>
                </div>
                <Controls
                    onAddItem={handleAddItem}
                    onClearAll={handleClearAll}
                    onRedoClear={handleRedoClear}
                    onHandlePopOut={handlePopOut}
                    isPopOut={false}
                    showErrorNotification={showErrorNotification}
                />
                <ClipboardList
                    clipboardItems={clipboardItems || []}
                    setClipboardItems={setClipboardItems}
                />
                {showErrorMessage && (
                    <div className="error-message" style={{ color: 'red', marginTop: '10px' }}>
                        {showErrorMessage}
                    </div>
                )}
            </div>
        </div>
    );
}