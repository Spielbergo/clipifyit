import { useState, useEffect } from 'react';
import ClipboardList from '../ClipboardList';
import Controls from '../Controls';

export default function FreeApp() {
    const [clipboardItems, setClipboardItems] = useState([]);
    const [clearedItems, setClearedItems] = useState([]);
    const [showErrorMessage, setShowErrorMessage] = useState(false);

    useEffect(() => {
        const storedItems = JSON.parse(localStorage.getItem('clipboardItems')) || [];
        setClipboardItems(storedItems);
    }, []);

    useEffect(() => {
        localStorage.setItem('clipboardItems', JSON.stringify(clipboardItems));
    }, [clipboardItems]);

    const handleAddItem = (text) => {
        if (clipboardItems.includes(text)) {
            return true;
        }
        setClipboardItems([text, ...clipboardItems]);
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

    return (
        <div className="app-main">
            <div className="app-wrapper">
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