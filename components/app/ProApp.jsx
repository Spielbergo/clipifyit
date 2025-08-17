import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import Image from 'next/image';

import HeroSection from '../HeroSection.component';
import LogInOptions from '../LogInOptions';
import ClipboardList from '../ClipboardList';
import Controls from '../Controls';
import ProjectsSidebar from '../ProjectsSidebar';
import ExpandSidebar from '../ExpandSidebar';
import DeleteProjectModal from '../DeleteProjectModal';
import SavedArticles from '../SavedArticles';

import { useFolders } from '../../hooks/useFolders';

import LogoWhite from '../../public/logos/logo-light-text.png';

export default function ProApp() {
    const [showCustomModal, setShowCustomModal] = useState(false);
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
    const [savedArticlesOpen, setSavedArticlesOpen] = useState(false);

    const {
        folders,
        selectedFolderId,
        setSelectedFolderId,
        renamingFolderId,
        setRenamingFolderId,
        renameFolderValue,
        setRenameFolderValue,
        addFolder,
        renameFolder,
        deleteFolder,
    } = useFolders(user, selectedProjectId);

    // Listen for auth state changes
    useEffect(() => {
        const session = supabase.auth.session?.() || supabase.auth.getSession?.();
        if (session && session.user) setUser(session.user);

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => {
            listener?.unsubscribe?.();
        };
    }, []);

    // Load clipboard items for the selected project
    const fetchCountRef = useRef(0);
    const prevVisibilityRef = useRef(typeof document !== 'undefined' ? document.visibilityState : 'visible');
    const lastFetchedDepsRef = useRef({ userId: null, selectedProjectId: null, selectedFolderId: null });
    useEffect(() => {
        const userId = user?.id || null;
        console.log('[Clipboard Effect] Invoked. Current deps:', { userId, selectedProjectId, selectedFolderId });
        const lastDeps = { userId, selectedProjectId, selectedFolderId };
        const last = lastFetchedDepsRef.current;
        const depsChanged = last.userId !== lastDeps.userId || last.selectedProjectId !== lastDeps.selectedProjectId || last.selectedFolderId !== lastDeps.selectedFolderId;
        console.log('[Clipboard Effect] Last fetched deps:', last);
        console.log('[Clipboard Effect] Deps changed:', depsChanged);
        const fetchItems = async () => {
            console.log('[Clipboard Fetch] fetchItems called. lastDeps:', lastDeps);
            if (!lastDeps.userId || !lastDeps.selectedProjectId) {
                console.log('[Clipboard Fetch] No user or project selected. Clearing clipboardItems.');
                setClipboardItems([]);
                lastFetchedDepsRef.current = { ...lastDeps };
                return;
            }
            fetchCountRef.current++;
            console.log('[Clipboard Fetch] Fetch count:', fetchCountRef.current, 'Project:', lastDeps.selectedProjectId, 'Folder:', lastDeps.selectedFolderId);
            let loaderTimeout = setTimeout(() => setLoading(true), 200);
            let query = supabase
                .from('clipboard_items')
                .select('*')
                .eq('project_id', lastDeps.selectedProjectId)
                .order('order', { ascending: true, nullsLast: true });

            if (lastDeps.selectedFolderId) {
                query = query.eq('folder_id', lastDeps.selectedFolderId);
            } else {
                query = query.is('folder_id', null);
            }

            const { data, error } = await query;
            clearTimeout(loaderTimeout);
            setLoading(false);
            setClipboardItems(data || []);
            lastFetchedDepsRef.current = { ...lastDeps };
            console.log('[Clipboard Fetch] Data:', data, 'Error:', error);
        };

        // Only fetch on dependency change
        if (depsChanged) {
            console.log('[Clipboard Effect] Dependencies changed, fetching items...');
            fetchItems();
        } else {
            console.log('[Clipboard Effect] Dependencies did NOT change, not fetching.');
        }
        // Cleanup: nothing to clean up
        return undefined;
    }, [user?.id, selectedProjectId, selectedFolderId]);

    // Add item to the selected project's clipboard
    const handleAddItem = async (text) => {
        if (!user || !selectedProjectId) return;
        if (clipboardItems.some(item => item.text === text)) return true;

        // Only count items in the current project/folder
        const currentItems = clipboardItems.filter(item =>
            item.project_id === selectedProjectId &&
            (selectedFolderId ? item.folder_id === selectedFolderId : !item.folder_id)
        );
        const newOrder = currentItems.length;

        console.log('Inserting:', {
            project_id: selectedProjectId,
            folder_id: selectedFolderId || null,
            text,
            created_at: new Date(),
            user_id: user.id,
            order: newOrder
        });     

        const insertObj = {
            project_id: selectedProjectId,
            folder_id: selectedFolderId || null,
            text,
            created_at: new Date(),
            user_id: user.id,
            order: newOrder
        };

        const { data, error } = await supabase
            .from('clipboard_items')
            .insert([insertObj])
            .select();

        console.log('Insert result:', data, error);

        if (!error && data) setClipboardItems([...(data || []), ...clipboardItems]);
        return false;
    };

    // Remove item from the selected project's clipboard
    const handleRemoveItem = async (id) => {
        if (!user || !selectedProjectId) return;
        await supabase
            .from('clipboard_items')
            .delete()
            .eq('id', id);
        setClipboardItems(clipboardItems.filter(item => item.id !== id));
    };

    // Edit item in the selected project's clipboard
    const handleSaveItem = async (id, newText) => {
        if (!user || !selectedProjectId) return;
        await supabase
            .from('clipboard_items')
            .update({ text: newText })
            .eq('id', id);
        setClipboardItems(clipboardItems.map(item => item.id === id ? { ...item, text: newText } : item));
    };

    // Clear all items in the selected project's clipboard
    const handleClearAll = async () => {
        if (!user || !selectedProjectId) return;
        setClearedItems([...clipboardItems]);
        const ids = clipboardItems.map(item => item.id);
        await Promise.all(
            ids.map(id =>
                supabase.from('clipboard_items').delete().eq('id', id)
            )
        );
        setClipboardItems([]);
    };

    // Redo clear (restore clearedItems to Supabase)
    const handleRedoClear = async () => {
        if (!user || !selectedProjectId || clearedItems.length === 0) return;
        await Promise.all(
            clearedItems.map(item =>
                supabase.from('clipboard_items').insert([
                    { id: item.id, project_id: selectedProjectId, text: item.text, created_at: item.createdAt || new Date() }
                ])
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

    // Load projects from Supabase
    useEffect(() => {
        if (!user) return;
        const fetchProjects = async () => {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            if (!error) {
                setProjects(data || []);
                if (!selectedProjectId && data && data.length > 0) setSelectedProjectId(data[0].id);
            }
        };
        fetchProjects();
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
        const { data, error } = await supabase
            .from('projects')
            .insert([{ user_id: user.id, name: name.trim(), created_at: new Date() }])
            .select();
        if (!error && data && data.length > 0) {
            setProjects([...projects, ...data]);
            setSelectedProjectId(data[0].id);
        }
        setCreatingProject(false);
    };

    // Delete a project
    const handleDeleteProject = (id) => {
        setProjectToDelete(id);
    };

    const confirmDeleteProject = async () => {
        if (!user || !projectToDelete) return;
        await supabase
            .from('projects')
            .delete()
            .eq('id', projectToDelete);
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
        await supabase
            .from('projects')
            .update({ name: newName })
            .eq('id', id);
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

    const showErrorNotification = (message) => {
        setShowErrorMessage(message);
        setTimeout(() => setShowErrorMessage(false), 2000);
    };

    if (!user) {
        return (
            <>
                <HeroSection
                    title="Login or Sign Up"
                    subtitle="Access your clipboard items and projects"
                />
                <div style={{ textAlign: 'center', marginTop: 80 }}>
                    <LogInOptions />
                </div>
            </>
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
                onSelect={projectId => {
                    setSelectedProjectId(projectId);
                    setSelectedFolderId(null); // Clear folder selection when switching projects
                }}
                onCreate={handleCreateProject}
                onDelete={handleDeleteProject}
                onRename={handleRenameProject}
                expanded={sidebarExpanded}
                onClose={isMobile ? () => setSidebarExpanded(false) : undefined}
                creatingProject={creatingProject}
                onSaveNewProject={handleSaveNewProject}
                folders={folders}
                selectedFolderId={selectedFolderId}
                onSelectFolder={setSelectedFolderId}
                onAddFolder={addFolder}
                onRenameFolder={renameFolder}
                onDeleteFolder={deleteFolder}
                renamingFolderId={renamingFolderId}
                setRenamingFolderId={setRenamingFolderId}
                renameFolderValue={renameFolderValue}
                setRenameFolderValue={setRenameFolderValue}
            />

            {/* Expand button for mobile (top left) */}
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

            {/* Floating expand button for mobile (bottom right) */}
            {isMobile && !sidebarExpanded && (
                <button
                    className="expand-sidebar-fab"
                    onClick={() => setSidebarExpanded(true)}
                    aria-label="Open sidebar"
                    style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}
                >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="4" width="4" height="16" rx="1" fill="#6599a6"/>
                        <rect x="9" y="4" width="12" height="16" rx="2" fill="#b3c6cc"/>
                    </svg>
                </button>
            )}
            
            <div className="app-wrapper">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', margin: '24px 0 12px 0', gap: 12 }}>
                    <h2
                        style={{
                            margin: 0,
                            fontWeight: 600,
                            fontSize: 24,
                            textAlign: 'left',
                        }}
                    >
                        {projects.find(p => p.id === selectedProjectId)?.name || 'No Project Selected'}
                        {selectedFolderId && (
                            <>
                            <span style={{ color: '#888', fontWeight: 400 }}> &nbsp;/&nbsp; </span>
                            {folders.find(f => f.id === selectedFolderId)?.name || ''}
                            </>
                        )}
                    </h2>
                    <button onClick={() => setSavedArticlesOpen(true)} title="View saved articles" style={{ alignSelf: 'flex-start' }}>
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
                    onShowCustomModalChange={setShowCustomModal}
                    selectedProjectId={selectedProjectId}
                    selectedFolderId={selectedFolderId}
                />
                {loading ? (
                    <div
                        style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: "50vh",
                        width: "100%",
                        //   opacity: 0.6,
                        background: "#4fc3f711",
                        borderRadius: 18,
                        boxShadow: "0 2px 16px #4fc3f711",
                        zIndex: 10,
                        }}
                    >
                        <span>
                            <Image
                                src={LogoWhite}
                                alt="Clipify It logo"
                                aria-label="Clipify It logo"
                                width="150"
                                height="50"
                                priority
                            />
                        </span>
                        <div style={{ fontSize: 22, fontWeight: 700, color: "#1976d2", marginBottom: 8 }}>
                        Welcome to Clipify It Pro!
                        </div>
                        <div style={{ fontSize: 16, textAlign: "center", maxWidth: 320 }}>
                        Get started by <span style={{ fontWeight: 600 }}>creating your first project</span>.<br />
                        Click the <span style={{ color: "#6599a6" }}>+ New Project</span> button in the sidebar.
                        </div>
                    </div>
                ) : (
                    <ClipboardList
                        clipboardItems={clipboardItems}
                        setClipboardItems={setClipboardItems}
                        onRemoveItem={handleRemoveItem}
                        onSaveItem={handleSaveItem}
                        selectedProjectId={selectedProjectId}
                        selectedFolderId={selectedFolderId}
                        isPro={true}
                        showCustomModal={showCustomModal}
                    />
                )}
                {showErrorMessage && (
                    <div className="error-message" style={{ color: 'red', marginTop: '10px' }}>
                        {showErrorMessage}
                    </div>
                )}
                <SavedArticles open={savedArticlesOpen} onClose={() => setSavedArticlesOpen(false)} />
            </div>
            <DeleteProjectModal
                open={!!projectToDelete}
                onCancel={cancelDeleteProject}
                onConfirm={confirmDeleteProject}
                projectName={projects.find(p => p.id === projectToDelete)?.name || ''}
            />
        </div>
    );
}