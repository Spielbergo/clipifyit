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
import { useRouter } from 'next/router';

import { useFolders } from '../../hooks/useFolders';

import LogoWhite from '../../public/logos/logo-light-text.png';

export default function ProApp() {
    const router = useRouter();
    
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
    // Saved Articles unified at /saved; no internal modal state needed

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
                .order('order', { ascending: false, nullsLast: true });

            if (lastDeps.selectedFolderId) {
                query = query.eq('folder_id', lastDeps.selectedFolderId);
            } else {
                query = query.is('folder_id', null);
            }

            const { data, error } = await query;
            clearTimeout(loaderTimeout);
            setLoading(false);
            setClipboardItems(data || []);
            // Default sort to 'custom' to reflect saved order per project/folder
            try {
                const ev = new CustomEvent('clipboard-sort-change', { detail: 'custom' });
                window.dispatchEvent(ev);
            } catch {}
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

    // Realtime: live sync clipboard items without extra fetches
    const rtChannelRef = useRef(null);
    useEffect(() => {
        if (!user || !selectedProjectId) return;
        // If an old channel exists, remove it first
        if (rtChannelRef.current) {
            try { supabase.removeChannel?.(rtChannelRef.current); } catch {}
            rtChannelRef.current = null;
        }
        const channelName = `rt-clipboard-${selectedProjectId}-${selectedFolderId || 'null'}`;
        const channel = supabase
            .channel(channelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'clipboard_items', filter: `project_id=eq.${selectedProjectId}` }, (payload) => {
                // Debug: verify realtime is firing
                try { console.debug('[Realtime][Main]', payload.eventType, payload.new || payload.old); } catch {}
                const row = payload.new || payload.old;
                if (!row) return;
                // Only handle current folder scope
                const isCurrentFolder = (selectedFolderId ? row.folder_id === selectedFolderId : !row.folder_id);
                if (!isCurrentFolder) return;
                setClipboardItems((prev) => {
                    let next = prev.slice();
                    switch (payload.eventType) {
                        case 'INSERT': {
                            const idx = next.findIndex(it => it.id === row.id);
                            if (idx >= 0) next[idx] = { ...next[idx], ...row };
                            else next = [row, ...next]; // newest first
                            break;
                        }
                        case 'UPDATE': {
                            const idx = next.findIndex(it => it.id === row.id);
                            if (idx >= 0) next[idx] = { ...next[idx], ...row };
                            else next = [row, ...next];
                            break;
                        }
                        case 'DELETE': {
                            next = next.filter(it => it.id !== row.id);
                            break;
                        }
                        default:
                            break;
                    }
                    // Always keep descending by order (newest on top)
                    next.sort((a, b) => (Number(b.order || 0) - Number(a.order || 0)));
                    return next;
                });
            })
            .subscribe((status) => {
                try { console.debug('[Realtime][Main] status:', status); } catch {}
            });
        rtChannelRef.current = channel;
        return () => {
            try { supabase.removeChannel?.(channel); } catch {}
            if (rtChannelRef.current === channel) rtChannelRef.current = null;
        };
    }, [user, selectedProjectId, selectedFolderId]);

    // Add item to the selected project's clipboard
    const handleAddItem = async (text) => {
        if (!user || !selectedProjectId) return;
        if (clipboardItems.some(item => item.text === text)) return true;

        // Compute next highest order in this project/folder so it appears at the top (we fetch desc)
        const currentItems = clipboardItems.filter(item =>
            item.project_id === selectedProjectId &&
            (selectedFolderId ? item.folder_id === selectedFolderId : !item.folder_id)
        );
        const newOrder = Math.max(0, ...currentItems.map(it => Number((it && it.order) || 0))) + 1;

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
            order: newOrder,
            // Optional: name could be set later via edit modal
        };

        const { data, error } = await supabase
            .from('clipboard_items')
            .insert([insertObj])
            .select();

        console.log('Insert result:', data, error);
    if (!error) {
            // Refetch current scope to ensure full, ordered list
            let q = supabase
                .from('clipboard_items')
                .select('*')
                .eq('project_id', selectedProjectId)
                .order('order', { ascending: false, nullsLast: true });
            if (selectedFolderId) q = q.eq('folder_id', selectedFolderId); else q = q.is('folder_id', null);
            const { data: fresh } = await q;
            setClipboardItems(fresh || []);
            try {
                const ev = new CustomEvent('clipboard-sort-change', { detail: 'custom' });
                window.dispatchEvent(ev);
            } catch {}
        }
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
    const handleSaveItem = async (id, newText, newName, newLabelColor, completed) => {
        if (!user || !selectedProjectId) return;
        const updateObj = { text: newText };
        const allowNameColumn = (typeof window !== 'undefined') ? (localStorage.getItem('clipboard_name_db_disabled') !== '1') : true;
        if (allowNameColumn && typeof newName !== 'undefined') updateObj.name = (newName === null ? null : (newName || null));
        const allowLabelColumn = (typeof window !== 'undefined') ? (localStorage.getItem('clipboard_label_db_disabled') !== '1') : true;
        if (allowLabelColumn && typeof newLabelColor !== 'undefined') updateObj.label_color = (newLabelColor === null ? null : (newLabelColor || null));
        const allowCompletedColumn = (typeof window !== 'undefined') ? (localStorage.getItem('clipboard_completed_db_disabled') !== '1') : true;
        if (allowCompletedColumn && typeof completed !== 'undefined') updateObj.completed = !!completed;
        const { error: updError } = await supabase
            .from('clipboard_items')
            .update(updateObj)
            .eq('id', id);
        if (updError) {
            const msg = String(updError.message || updError.details || '');
            if (/column\s+.*name.*\s+does not exist/i.test(msg)) {
                try { localStorage.setItem('clipboard_name_db_disabled', '1'); } catch {}
            }
            if (/column\s+.*label_color.*\s+does not exist/i.test(msg)) {
                try { localStorage.setItem('clipboard_label_db_disabled', '1'); } catch {}
            }
            if (/column\s+.*completed.*\s+does not exist/i.test(msg)) {
                try { localStorage.setItem('clipboard_completed_db_disabled', '1'); } catch {}
            }
        }
        setClipboardItems(clipboardItems.map(item => item.id === id ? { ...item, text: newText, name: (typeof newName !== 'undefined') ? (newName === null ? null : (newName || null)) : item.name, label_color: (typeof newLabelColor !== 'undefined') ? (newLabelColor === null ? null : (newLabelColor || null)) : item.label_color, completed: (typeof completed !== 'undefined') ? !!completed : item.completed } : item));
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
                    <button onClick={() => router.push('/saved')} title="View saved articles" style={{ alignSelf: 'flex-start' }}>
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