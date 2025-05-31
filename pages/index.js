import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ClipboardList from '../components/ClipboardList';
import Controls from '../components/Controls';

export default function Home() {
    const [clipboardItems, setClipboardItems] = useState([]);
    const [clearedItems, setClearedItems] = useState([]);
    const [showErrorMessage, setShowErrorMessage] = useState(false);
    const router = useRouter();

    // Load clipboard items from localStorage on mount
    useEffect(() => {
        const storedItems = JSON.parse(localStorage.getItem('clipboardItems')) || [];
        setClipboardItems(storedItems);
    }, []);

    // Save clipboard items to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('clipboardItems', JSON.stringify(clipboardItems));
    }, [clipboardItems]);

    const handleAddItem = (text) => {
        if (clipboardItems.includes(text)) {
            return true; // Indicate that the item is a duplicate
        }
        setClipboardItems([text, ...clipboardItems]);
        return false; // Indicate that the item was successfully added
    };

    const showErrorNotification = (message) => {
        setShowErrorMessage(message); // Set the error message
        setTimeout(() => {
            setShowErrorMessage(false); // Clear the error message after 2 seconds
        }, 2000);
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
                    clipboardItems={clipboardItems}
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