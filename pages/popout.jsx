import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Helper to fetch project/folder names from Supabase
async function fetchProjectName(projectId) {
    if (!projectId) return '';
    const { data } = await supabase.from('projects').select('name').eq('id', projectId).single();
    return data?.name || '';
}
async function fetchFolderName(folderId) {
    if (!folderId) return '';
    const { data } = await supabase.from('folders').select('name').eq('id', folderId).single();
    return data?.name || '';
}

// Helper to parse query params
function getQueryParams() {
    if (typeof window === 'undefined') return {};
    const params = new URLSearchParams(window.location.search);
    return {
        projectId: params.get('project') || '',
        folderId: params.get('folder') || '',
    };
}

import Controls from '../components/Controls';
import ClipboardList from '../components/ClipboardList';


export default function PopOut() {
    const [projects, setProjects] = useState([]);
    const [folders, setFolders] = useState([]);
    // Add popout class to body for popout-specific styling
    useEffect(() => {
        document.body.classList.add('popout');
        return () => {
            document.body.classList.remove('popout');
        };
    }, []);
    const [projectId, setProjectId] = useState(null);
    const [folderId, setFolderId] = useState(null);
    const [clipboardItems, setClipboardItems] = useState([]);
    const [clearedItems, setClearedItems] = useState([]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const isPro = !!(user && projectId !== '');
    const isFree = !user && projectId === '';
    const [projectName, setProjectName] = useState('');
    const [folderName, setFolderName] = useState('');

    // On mount, get query params from URL (client only)
    useEffect(() => {
        const params = getQueryParams();
        // If no project param, treat as free mode (empty string)
        setProjectId(params.projectId !== undefined && params.projectId !== null ? params.projectId : '');
        setFolderId(params.folderId !== undefined && params.folderId !== null ? params.folderId : '');
    }, []);

    // Get user session
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUser(data?.user || null);
        });
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
        });
        return () => { listener?.subscription?.unsubscribe?.(); };
    }, []);

    // Fetch projects for user (Pro mode)
    useEffect(() => {
        if (!user) return;
        supabase
            .from('projects')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .then(({ data }) => {
                setProjects(data || []);
            });
    }, [user]);

    // Fetch all folders for all projects (Pro mode)
    useEffect(() => {
        if (!user) {
            setFolders([]);
            return;
        }
        supabase
            .from('folders')
            .select('*')
            .in('project_id', projects.map(p => p.id))
            .order('created_at', { ascending: true })
            .then(({ data }) => {
                setFolders(data || []);
            });
    }, [user, projects]);

    // Fetch project/folder names for Pro mode
    useEffect(() => {
        if (!isPro) {
            setProjectName('');
            setFolderName('');
            return;
        }
        let ignore = false;
        (async () => {
            const [proj, fold] = await Promise.all([
                fetchProjectName(projectId),
                folderId ? fetchFolderName(folderId) : Promise.resolve('')
            ]);
            if (!ignore) {
                setProjectName(proj);
                setFolderName(fold);
            }
        })();
        return () => { ignore = true; };
    }, [isPro, projectId, folderId]);

    // Fetch clipboard items (Pro: Supabase, Free: localStorage)
    useEffect(() => {
        if (projectId === null) return;
        if (isPro && (user === null)) return;
        async function fetchItems() {
            setLoading(true);
            if (isPro) {
                // Pro: fetch from Supabase
                let query = supabase
                    .from('clipboard_items')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('order', { ascending: true, nullsLast: true });
                if (folderId) {
                    query = query.eq('folder_id', folderId);
                } else {
                    query = query.is('folder_id', null);
                }
                const { data, error } = await query;
                setClipboardItems(data || []);
            } else if (isFree) {
                // Free: only if user is not logged in and projectId is ''
                const storedItems = JSON.parse(localStorage.getItem('clipboardItems')) || [];
                setClipboardItems(storedItems);
            }
            setLoading(false);
        }
        fetchItems();
        // eslint-disable-next-line
    }, [user, projectId, folderId, isPro, isFree]);

    // Free mode: listen for localStorage changes from other windows
    useEffect(() => {
        if (!isFree) return;
        function handleStorage(e) {
            if (e.key === 'clipboardItems') {
                const storedItems = JSON.parse(e.newValue) || [];
                setClipboardItems(storedItems);
            }
        }
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [isFree]);

    // Free: persist to localStorage
    useEffect(() => {
        // Only persist to localStorage in free mode, after user and projectId are loaded
        if (user === null || projectId === null) return;
        if (isFree) {
            localStorage.setItem('clipboardItems', JSON.stringify(clipboardItems));
        }
    }, [clipboardItems, isFree, user, projectId]);

    // Add item handler
    const handleAddItem = async (text) => {
        if (isPro) {
            // Pro: check for duplicate
            if (clipboardItems.some(item => (typeof item === 'string' ? item : item.text) === text)) {
                return true;
            }
            const insertObj = {
                project_id: projectId,
                folder_id: folderId || null,
                text,
                created_at: new Date(),
                order: clipboardItems.length,
            };
            const { data, error } = await supabase
                .from('clipboard_items')
                .insert([insertObj])
                .select();
            if (!error && data) {
                setClipboardItems(prev => [ ...prev, ...(data || []) ]);
            }
            return false;
        } else {
            // Free
            if (clipboardItems.includes(text)) {
                return true;
            }
            setClipboardItems([...clipboardItems, text]);
            return false;
        }
    };

    // Clear all handler
    const handleClearAll = async () => {
        if (isPro) {
            // Pro: delete all items for this project/folder
            let query = supabase
                .from('clipboard_items')
                .delete()
                .eq('project_id', projectId);
            if (folderId) {
                query = query.eq('folder_id', folderId);
            } else {
                query = query.is('folder_id', null);
            }
            await query;
            setClipboardItems([]);
        } else {
            // Free
            setClearedItems([...clipboardItems]);
            setClipboardItems([]);
        }
    };

    // Redo clear handler
    const handleRedoClear = () => {
        if (isPro) {
            // Pro: not supported (could implement if needed)
            return;
        } else {
            setClipboardItems([...clearedItems]);
            setClearedItems([]);
        }
    };

    const showErrorNotification = (message) => {
        const errorElement = document.querySelector('.no-selection-message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 2000);
        }
    };

    // Don't render until projectId is loaded
    // In Pro mode, also wait for user
    if (projectId === null) return null;
    if (projectId !== '' && user === null) return null;

    return (
        <div>
            {isPro && (projectName || folderName) && (
                <h1>
                    {projectName && <span>{projectName}</span>}
                    {folderName && <span style={{ marginLeft: 16 }}>/ {folderName}</span>}
                </h1>
            )}
            <Controls
                onAddItem={handleAddItem}
                onClearAll={handleClearAll}
                onRedoClear={handleRedoClear}
                isPopOut={true}
                showErrorNotification={showErrorNotification}
                selectedProjectId={projectId}
                selectedFolderId={folderId}
                projects={projects}
                folders={folders}
                onSwitchProjectFolder={(newProjectId, newFolderId) => {
                    // Update URL and reload clipboard for new project/folder
                    const params = [`project=${encodeURIComponent(newProjectId)}`];
                    if (newFolderId) params.push(`folder=${encodeURIComponent(newFolderId)}`);
                    window.location.search = '?' + params.join('&');
                }}
            />
            <ClipboardList
                clipboardItems={clipboardItems}
                setClipboardItems={setClipboardItems}
                isPro={isPro}
                selectedProjectId={projectId}
                selectedFolderId={folderId}
            />
            <div className="no-selection-message"></div>
        </div>
    );
}