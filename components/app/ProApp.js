import { useState, useEffect } from 'react';
import { auth, db } from '../../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import {
  collection, addDoc, getDocs, doc, deleteDoc, setDoc, query, orderBy
} from 'firebase/firestore';
import LogInOptions from '../LogInOptions';

import ClipboardList from '../ClipboardList';
import Controls from '../Controls';

export default function ProApp() {
    const [clipboardItems, setClipboardItems] = useState([]);
    const [clearedItems, setClearedItems] = useState([]);
    const [showErrorMessage, setShowErrorMessage] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, setUser);
        return () => unsubscribe();
    }, []);

    // Load clipboard items from Firestore when user logs in
    useEffect(() => {
        if (!user) return;
        setLoading(true);
        const fetchItems = async () => {
            const q = query(collection(db, 'users', user.uid, 'clipboardItems'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            setClipboardItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        };
        fetchItems();
    }, [user]);

    // Add item to Firestore
    const handleAddItem = async (text) => {
        if (!user) return;
        // Prevent duplicates
        if (clipboardItems.some(item => item.text === text)) return true;
        await addDoc(collection(db, 'users', user.uid, 'clipboardItems'), {
            text,
            createdAt: Date.now()
        });
        // Reload items
        const q = query(collection(db, 'users', user.uid, 'clipboardItems'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        setClipboardItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        return false;
    };

    // Remove item from Firestore
    const handleRemoveItem = async (id) => {
        if (!user) return;
        await deleteDoc(doc(db, 'users', user.uid, 'clipboardItems', id));
        setClipboardItems(clipboardItems.filter(item => item.id !== id));
    };

    // Edit item in Firestore
    const handleSaveItem = async (id, newText) => {
        if (!user) return;
        await setDoc(doc(db, 'users', user.uid, 'clipboardItems', id), {
            text: newText,
            createdAt: Date.now()
        });
        setClipboardItems(clipboardItems.map(item => item.id === id ? { ...item, text: newText } : item));
    };

    // Clear all items (move to clearedItems, remove from Firestore)
    const handleClearAll = async () => {
        if (!user) return;
        setClearedItems([...clipboardItems]);
        // Remove all from Firestore
        await Promise.all(
            clipboardItems.map(item =>
                deleteDoc(doc(db, 'users', user.uid, 'clipboardItems', item.id))
            )
        );
        setClipboardItems([]);
    };

    // Redo clear (restore clearedItems to Firestore)
    const handleRedoClear = async () => {
        if (!user || clearedItems.length === 0) return;
        await Promise.all(
            clearedItems.map(item =>
                setDoc(doc(db, 'users', user.uid, 'clipboardItems', item.id), {
                    text: item.text,
                    createdAt: item.createdAt || Date.now()
                })
            )
        );
        setClipboardItems([...clearedItems]);
        setClearedItems([]);
    };

    // Pop out window handler (unchanged)
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

    // const handleLogout = async () => {
    //     await signOut(auth);
    // };

    const showErrorNotification = (message) => {
        setShowErrorMessage(message);
        setTimeout(() => setShowErrorMessage(false), 2000);
    };

    if (!user) {
        return (
            <div style={{ textAlign: 'center', marginTop: 80 }}>
                <h2>Sign in to use Clipify It Pro</h2>
                <LogInOptions />
            </div>
        );
    }

    return (
        <div className="app-main">
            {/* <button onClick={handleLogout} style={{ float: 'right' }}>Logout</button> */}
            <div className="app-wrapper">
                <h1>Clipify It Pro</h1>
                <Controls
                    onAddItem={handleAddItem}
                    onClearAll={handleClearAll}
                    onRedoClear={handleRedoClear}
                    onHandlePopOut={handlePopOut}
                    isPopOut={false}
                    showErrorNotification={showErrorNotification}
                />
                {loading ? (
                    <div>Loading...</div>
                ) : (
                    <ClipboardList
                        clipboardItems={clipboardItems}
                        setClipboardItems={setClipboardItems}
                        onRemoveItem={handleRemoveItem}
                        onSaveItem={handleSaveItem}
                    />
                )}
                {showErrorMessage && (
                    <div className="error-message" style={{ color: 'red', marginTop: '10px' }}>
                        {showErrorMessage}
                    </div>
                )}
            </div>
        </div>
    );
}