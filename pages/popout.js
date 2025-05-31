import { useState, useEffect } from 'react';
import Controls from '../components/Controls';
import ClipboardList from '../components/ClipboardList';

export default function PopOut() {
    const [clipboardItems, setClipboardItems] = useState([]);
    const [clearedItems, setClearedItems] = useState([]);

    useEffect(() => {
        const storedItems = JSON.parse(localStorage.getItem('clipboardItems')) || [];
        setClipboardItems(storedItems);
    }, []);

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

    const handleClearAll = () => {
        setClearedItems([...clipboardItems]);
        setClipboardItems([]);
    };

    const handleRedoClear = () => {
        setClipboardItems([...clearedItems]);
        setClearedItems([]);
    };

    const showErrorNotification = (message) => {
        console.log("Error Notification Triggered:", message); // Debugging log
        const errorElement = document.querySelector('.no-selection-message');
        if (errorElement) {
            errorElement.textContent = message; // Set the error message text
            errorElement.style.display = 'block'; // Show the error message
            setTimeout(() => {
                errorElement.style.display = 'none'; // Hide the error message after 2 seconds
            }, 2000);
        }
    };

    return (
        <div>
            <h1>Clipify It (Pop-Out)</h1>
            <Controls
                onAddItem={handleAddItem}
                onClearAll={handleClearAll}
                onRedoClear={handleRedoClear}
                isPopOut={true}
                showErrorNotification={showErrorNotification}
            />
            <ClipboardList
                clipboardItems={clipboardItems}
                setClipboardItems={setClipboardItems}
            />
            <div className="no-selection-message"></div>
        </div>
    );
}