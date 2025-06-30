import { useState, useEffect } from 'react';
import { auth, db } from '../../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import {
  collection, addDoc, getDocs, doc, deleteDoc, setDoc, query, orderBy
} from 'firebase/firestore';
import LogInOptions from '../LogInOptions';

import ClipboardList from '../ClipboardList';
import Controls from '../Controls';
import ProjectsSidebar from '../ProjectsSidebar';

export default function ProApp() {
    const [clipboardItems, setClipboardItems] = useState([]);
    const [clearedItems, setClearedItems] = useState([]);
    const [showErrorMessage, setShowErrorMessage] = useState(false);
    const [user, setUser] = useState(null);
    const [sidebarExpanded, setSidebarExpanded] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [creatingProject, setCreatingProject] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, setUser);
        return () => unsubscribe();
    }, []);

    // Load clipboard items for the selected project
    useEffect(() => {
        if (!user || !selectedProjectId) {
            setClipboardItems([]);
            return;
        }
        setLoading(true);
        const fetchItems = async () => {
            const q = query(
                collection(db, 'users', user.uid, 'projects', selectedProjectId, 'clipboardItems'),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            setClipboardItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        };
        fetchItems();
    }, [user, selectedProjectId]);

    // Add item to the selected project's clipboard
    const handleAddItem = async (text) => {
        if (!user || !selectedProjectId) return;
        // Prevent duplicates
        if (clipboardItems.some(item => item.text === text)) return true;
        await addDoc(
            collection(db, 'users', user.uid, 'projects', selectedProjectId, 'clipboardItems'),
            { text, createdAt: Date.now() }
        );
        // Reload items
        const q = query(
            collection(db, 'users', user.uid, 'projects', selectedProjectId, 'clipboardItems'),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        setClipboardItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        return false;
    };

    // Remove item from the selected project's clipboard
    const handleRemoveItem = async (id) => {
        if (!user || !selectedProjectId) return;
        await deleteDoc(doc(db, 'users', user.uid, 'projects', selectedProjectId, 'clipboardItems', id));
        setClipboardItems(clipboardItems.filter(item => item.id !== id));
    };

    // Edit item in the selected project's clipboard
    const handleSaveItem = async (id, newText) => {
        if (!user || !selectedProjectId) return;
        await setDoc(
            doc(db, 'users', user.uid, 'projects', selectedProjectId, 'clipboardItems', id),
            { text: newText, createdAt: Date.now() }
        );
        setClipboardItems(clipboardItems.map(item => item.id === id ? { ...item, text: newText } : item));
    };

    // Clear all items in the selected project's clipboard
    const handleClearAll = async () => {
        if (!user || !selectedProjectId) return;
        setClearedItems([...clipboardItems]);
        await Promise.all(
            clipboardItems.map(item =>
                deleteDoc(doc(db, 'users', user.uid, 'projects', selectedProjectId, 'clipboardItems', item.id))
            )
        );
        setClipboardItems([]);
    };

    // Redo clear (restore clearedItems to Firestore)
    const handleRedoClear = async () => {
        if (!user || !selectedProjectId || clearedItems.length === 0) return;
        await Promise.all(
            clearedItems.map(item =>
                setDoc(
                    doc(db, 'users', user.uid, 'projects', selectedProjectId, 'clipboardItems', item.id),
                    { text: item.text, createdAt: item.createdAt || Date.now() }
                )
            )
        );
        setClipboardItems([...clearedItems]);
        setClearedItems([]);
    };

    useEffect(() => {
        if (typeof window !== "undefined") {
            setIsMobile(window.innerWidth < 900);
            const handleResize = () => setIsMobile(window.innerWidth < 900);
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);

    // Load projects from Firestore
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'users', user.uid, 'projects'));
        getDocs(q).then(snapshot => {
            const projs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProjects(projs);
            if (!selectedProjectId && projs.length > 0) setSelectedProjectId(projs[0].id);
        });
    }, [user]);

    // Create a new project
    const handleCreateProject = () => {
      setCreatingProject(true);
    };

    const handleSaveNewProject = async (name) => {
        if (!user || !name.trim()) {
            setCreatingProject(false);
            return;
        }
        const docRef = await addDoc(collection(db, 'users', user.uid, 'projects'), {
                name: name.trim(),
                createdAt: Date.now()
            });
            setProjects([...projects, { id: docRef.id, name: name.trim(), createdAt: Date.now() }]);
            setSelectedProjectId(docRef.id);
            setCreatingProject(false);
        };

    // Delete a project
    const handleDeleteProject = (id) => {
        setProjectToDelete(id);
    };

    const confirmDeleteProject = async () => {
        if (!user || !projectToDelete) return;
        await deleteDoc(doc(db, 'users', user.uid, 'projects', projectToDelete));
        setProjects(projects.filter(p => p.id !== projectToDelete));
        if (selectedProjectId === projectToDelete) setSelectedProjectId(projects[0]?.id || '');
        setProjectToDelete(null);
    };

    const cancelDeleteProject = () => {
        setProjectToDelete(null);
    };

    // Rename a project
    const handleRenameProject = async (id, newName) => {
        if (!user || !id || !newName) return;
        await setDoc(doc(db, 'users', user.uid, 'projects', id), { name: newName }, { merge: true });
        setProjects(projects.map(p => p.id === id ? { ...p, name: newName } : p));
    };

    // Pop out window handler
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
            {/* Overlay for mobile */}
            {isMobile && sidebarExpanded && (
            <div
                className="sidebar-overlay"
                onClick={() => setSidebarExpanded(false)}
            />
            )}
            {/* Sidebar */}
            <ProjectsSidebar 
                className={`projects-sidebar${isMobile && sidebarExpanded ? ' expanded' : ''}`}
                projects={projects}
                selectedProjectId={selectedProjectId}
                onSelect={setSelectedProjectId}
                onCreate={handleCreateProject}
                onDelete={handleDeleteProject}
                onRename={handleRenameProject}
                expanded={sidebarExpanded}
                onClose={isMobile ? () => setSidebarExpanded(false) : undefined}
                creatingProject={creatingProject}
                onSaveNewProject={handleSaveNewProject}
            />
            {/* Expand button for mobile */}
            {isMobile && !sidebarExpanded && (
            <button
                className="expand-sidebar-btn"
                onClick={() => setSidebarExpanded(true)}
                aria-label="Open sidebar"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="4" height="16" rx="1" fill="#6599a6"/>
                <rect x="9" y="4" width="12" height="16" rx="2" fill="#b3c6cc"/>
                </svg>
            </button>
            )}
            <div className="app-wrapper">
                <h2
                    style={{
                        margin: '24px 0 12px 0',
                        fontWeight: 600,
                        fontSize: 24,
                        textAlign: 'left',
                        color: '#333',
                        width: '100%'
                    }}
                    >
                    {projects.find(p => p.id === selectedProjectId)?.name || 'No Project Selected'}
                </h2>
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
            {projectToDelete && (
            <div className="modal-overlay">
                <div className="modal">
                <p>Are you sure you want to delete this project?</p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
                    <button onClick={cancelDeleteProject}>Cancel</button>
                    <button onClick={confirmDeleteProject} style={{ background: '#c00', color: '#fff' }}>Delete</button>
                </div>
                </div>
            </div>
            )}
        </div>
    );
}