import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import LogInOptions from '../LogInOptions';

import ClipboardList from '../ClipboardList';
import Controls from '../Controls';
import ProjectsSidebar from '../ProjectsSidebar';
import ExpandSidebar from '../ExpandSidebar';
import DeleteProjectModal from '../DeleteProjectModal';

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
    useEffect(() => {
        if (!user || !selectedProjectId) {
            setClipboardItems([]);
            return;
        }
        setLoading(true);
        const fetchItems = async () => {
            const { data, error } = await supabase
                .from('clipboard_items')
                .select('*')
                .eq('project_id', selectedProjectId)
                .order('created_at', { ascending: false });
            setClipboardItems(data || []);
            setLoading(false);
        };
        fetchItems();
    }, [user, selectedProjectId]);

    // Add item to the selected project's clipboard
    const handleAddItem = async (text) => {
        if (!user || !selectedProjectId) return;
        // Prevent duplicates
        if (clipboardItems.some(item => item.text === text)) return true;
        const { data, error } = await supabase
            .from('clipboard_items')
            .insert([{ project_id: selectedProjectId, text, created_at: new Date() }])
            .select();
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
            <DeleteProjectModal
                open={!!projectToDelete}
                onCancel={cancelDeleteProject}
                onConfirm={confirmDeleteProject}
            />
        </div>
    );
}