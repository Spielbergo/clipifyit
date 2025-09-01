import React, { useState, useEffect, useRef } from 'react';

import SortBar from './SortBar.component';
import SearchBar from './SearchBar.component';
import DeleteFolderModal from './DeleteFolderModal';

import styles from './projects-sidebar.module.css';

// Recursive folder tree component
function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onSelect,
  onRenameFolder,
  renamingFolderId: activeRenamingFolderId = null,
  setRenamingFolderId,
  renameFolderValue,
  setRenameFolderValue,
  projectId,
  setFolderToDelete,
  parentId 
}) {
  return (
    <ul style={{ paddingLeft: parentId ? 18 : 5, margin: 0 }}>
      {folders
        .filter(folder => folder.parent_id === parentId && folder.project_id === projectId)
        .map(folder => (
          <li
            key={folder.id}
            style={{ marginBottom: 2 }}
            onDragOver={(e) => { try { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; } catch {} }}
            onDrop={(e) => {
              try {
                e.preventDefault();
                e.stopPropagation();
                const str = e.dataTransfer.getData('application/x-clipify-ids');
                if (!str) return;
                const payload = JSON.parse(str);
                const detail = { ids: payload.ids || [], targetProjectId: folder.project_id, targetFolderId: folder.id };
                const ev = new CustomEvent('clipboard-move-request', { detail });
                window.dispatchEvent(ev);
              } catch {}
            }}
          >
            {activeRenamingFolderId === folder.id ? (
              <form
                style={{ display: 'flex', alignItems: 'center' }}
                onSubmit={e => {
                  e.preventDefault();
                  if (renameFolderValue.trim()) {
                    onRenameFolder(folder.id, renameFolderValue.trim());
                  }
                  setRenamingFolderId(null);
                }}
              >
                <input
                  value={renameFolderValue}
                  onChange={e => setRenameFolderValue(e.target.value)}
                  autoFocus
                  style={{
                    flex: 1,
                    marginRight: 6,
                    background: '#333',
                    borderRadius: 4,
                    border: '1px solid #ccc',
                    padding: 4,
                  }}
                />
                <button type="submit" style={{ marginRight: 4 }}>
                  Save
                </button>
              </form>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span
                  style={{
                    cursor: 'pointer',
                    fontWeight: folder.id === selectedFolderId ? 700 : 400,
                    color: '#b3e5fc',
                    flex: 1,
                  }}
                  onClick={() => {
                    if (onSelect) onSelect(folder.project_id); // Switch project
                    onSelectFolder(folder.id);                  // Select folder
                  }}
                  title={folder.name}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 20 20"
                    fill="none"
                    style={{ marginRight: 8, opacity: 0.7, marginBottom: "-2.5px" }}
                  >
                    <path
                      d="M2 5a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z"
                      stroke={folder.id === selectedFolderId ? '#b3e5fc' : '#ddd'}
                      strokeWidth="1.2"
                      fill={folder.id === selectedFolderId ? '#b3e5fc' : 'none'}
                    />
                  </svg>
                  {folder.name}
                </span>
                <button
                  title="Rename folder"
                  style={{ marginRight: 4 }}
                  onClick={() => {
                    setRenamingFolderId(folder.id);
                    setRenameFolderValue(folder.name);
                  }}
                >
                  ✎
                </button>
                <button
                  title="Delete folder"
                  onClick={() => setFolderToDelete(folder)}
                >
                  🗑
                </button>
              </div>
            )}            
          </li>
        ))}
    </ul>
  );
}

export default function ProjectsSidebar({
  projects = [],
  selectedProjectId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  expanded,
  onClose,
  creatingProject,
  onSaveNewProject,
  // Folder-related props:
  folders = [],
  selectedFolderId,
  onSelectFolder,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder,
}) {
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [sortMode, setSortMode] = useState('latest'); // 'alpha', 'oldest', 'latest'
  const [search, setSearch] = useState('');
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [collapsedProjects, setCollapsedProjects] = useState({});
  const [hoveredProjectId, setHoveredProjectId] = useState(null);

  // Folder rename state (for FolderTree)
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [renameFolderValue, setRenameFolderValue] = useState('');

  // Track folder counts per project to avoid UI flicker (arrows greying out) during refetches
  const [projectFolderCounts, setProjectFolderCounts] = useState({});
  const countsInitializedRef = useRef(false);
  const lastDeletedProjectIdRef = useRef(null);
  const lastDeletedFolderIdRef = useRef(null);
  const prevFoldersByProjectRef = useRef({});

  useEffect(() => {
    // Group incoming folders by project
    const grouped = folders.reduce((acc, f) => {
      (acc[f.project_id] = acc[f.project_id] || []).push(f);
      return acc;
    }, {});

    // Build next cache without causing unrelated projects to drop to 0 during brief refetches
    const nextCache = { ...prevFoldersByProjectRef.current };

    // Seed cache on first run
    if (!countsInitializedRef.current) {
      projects.forEach(p => {
        nextCache[p.id] = grouped[p.id] ? [...grouped[p.id]] : [];
      });
      countsInitializedRef.current = true;
    } else {
      projects.forEach(p => {
        const pid = p.id;
        const current = grouped[pid] || [];
        const prev = prevFoldersByProjectRef.current[pid] || [];
        const isTarget = pid === lastDeletedProjectIdRef.current;
        const prevMinusDeleted = isTarget && lastDeletedFolderIdRef.current
          ? prev.filter(f => f.id !== lastDeletedFolderIdRef.current)
          : prev;

        if (current.length > 0) {
          nextCache[pid] = [...current];
        } else if (isTarget && prevMinusDeleted.length > 0) {
          // Keep previous-minus-deleted for the project we just modified
          nextCache[pid] = prevMinusDeleted;
        } else if (!isTarget && prev.length > 0) {
          // Keep previous list to avoid UI flicker for unrelated projects
          nextCache[pid] = prev;
        } else {
          // Legit drop to zero (no folders remain)
          nextCache[pid] = [];
        }
      });
    }

    prevFoldersByProjectRef.current = nextCache;

    // Update counts from cache
    const counts = Object.fromEntries(
      projects.map(p => [p.id, (nextCache[p.id] || []).length])
    );
    setProjectFolderCounts(counts);

    // Reset last-deleted markers after applying
    lastDeletedProjectIdRef.current = null;
    lastDeletedFolderIdRef.current = null;
  }, [folders, projects]);

  // Persist collapsed state so it survives re-mounts (e.g., after folder deletes)
  useEffect(() => {
    try {
      localStorage.setItem('sidebarCollapsed', JSON.stringify(collapsedProjects));
    } catch {}
  }, [collapsedProjects]);

  // Sorting logic
  let sortedProjects = React.useMemo(() => {
    if (sortMode === 'alpha') {
      return [...projects].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'descAlpha') {
      return [...projects].sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortMode === 'oldest') {
      return [...projects].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortMode === 'latest') {
      return [...projects].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return [...projects];
  }, [projects, sortMode]);

  const filteredProjects = sortedProjects.filter(project => {
    const projectMatches = project.name.toLowerCase().includes(search.toLowerCase());
    const folderMatches = folders.some(
      f => f.project_id === project.id && f.name.toLowerCase().includes(search.toLowerCase())
    );
    return projectMatches || folderMatches;
  });

  const flatSearchResults = search
  ? [
      ...projects
        .filter(project =>
          project.name.toLowerCase().includes(search.toLowerCase())
        )
        .map(project => ({ type: 'project', item: project })),
      ...folders
        .filter(folder =>
          folder.name.toLowerCase().includes(search.toLowerCase())
        )
        .map(folder => ({ type: 'folder', item: folder })),
    ]
  : [];

  function isDescendantFolder(folders, parentId, childId) {
    let current = folders.find(f => f.id === childId);
    while (current && current.parent_id) {
      if (current.parent_id === parentId) return true;
      current = folders.find(f => f.id === current.parent_id);
    }
    return false;
  }

  useEffect(() => {
    if (!selectedFolderId) return;
    const folder = folders.find(f => f.id === selectedFolderId);
    if (!folder) return;
    // Expand the parent project
    setCollapsedProjects(prev => ({
      ...prev,
      [folder.project_id]: false
    }));
  }, [selectedFolderId, folders]);

  const toggleProjectFolders = (projectId) => {
    setCollapsedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  useEffect(() => {
    // Only set collapsed state when projects change (not on selectedProjectId)
    const saved = (() => {
      try {
        return JSON.parse(localStorage.getItem('sidebarCollapsed') || '{}');
      } catch {
        return {};
      }
    })();
    setCollapsedProjects(prev => {
      // If projects were added/removed, add new keys but keep user state for existing ones
      const next = { ...prev };
      projects.forEach(p => {
        if (!(p.id in next)) next[p.id] = typeof saved[p.id] === 'boolean' ? saved[p.id] : false; // default to expanded unless saved
      });
      return next;
    });
  }, [projects]);




  // console.log('Projects:', projects);
  // console.log('Folders:', folders);
  
  return (
    <>
      <aside className={`projects-sidebar${expanded ? ' expanded' : ''}`}>
        <div className='sidebar-header--container'>
          <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12 }}>
            <span style={{ fontWeight: 600, fontSize: 18 }}>Projects</span>
            {onClose && (
              <button className="close-btn" onClick={onClose} style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer' }}>
                ×
              </button>
            )}
          </div>
          {/* Sort Toggle */}
          <SortBar sortMode={sortMode} setSortMode={setSortMode} />
  
          {/* Search Bar */}
          <SearchBar
            value={search}
            onChange={setSearch}
            onClear={() => setSearch('')}
          />
  
          {/* New Project Button */}
          <button
            onClick={onCreate}
            style={{
              width: '90%',
              margin: '12px 5%',
              padding: '8px 0',
              borderRadius: 4,
              background: 'var(--primary-color)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 16,
              border: 'none',
              cursor: 'pointer',
            }}
            disabled={creatingProject}
          >
            + New Project
          </button>
        </div>
        <div className={styles.projects_list__scroll}>
          <ul style={{ padding: '0 15px', margin: 0 }}>
            {search ? (
              flatSearchResults.length === 0 ? (
                <li style={{ color: '#aaa', padding: 12 }}>No results</li>
              ) : (
                flatSearchResults.map(result =>
                  result.type === 'project' ? (
                    <li
                      key={`project-${result.item.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: '#333',
                        color: '#eee',
                        padding: '10px 12px',
                        borderRadius: 4,
                        marginBottom: 2,
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setSearch('');
                        onSelect && onSelect(result.item.id);
                      }}
                    >
                      <span style={{ fontWeight: 600, marginRight: 8 }}>
                        {/* Folder ICon */}
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 20 20"
                          fill="none"
                          style={{ marginRight: 8, opacity: 0.7, marginBottom: "-2.5px" }}
                        >
                          <path
                            d="M2 5a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z"
                            stroke="#ddd"
                            strokeWidth="1.2"
                            fill="none"
                          />
                        </svg>
                      </span>
                      {result.item.name}
                      <span style={{ marginLeft: 8, fontSize: 12, color: '#aaa' }}>(Project)</span>
                    </li>
                  ) : (
                    <li
                      key={`folder-${result.item.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: '#222',
                        color: '#b3e5fc',
                        padding: '10px 12px',
                        borderRadius: 4,
                        marginBottom: 2,
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setSearch('');
                        onSelect && onSelect(result.item.project_id);
                        onSelectFolder && onSelectFolder(result.item.id);
                      }}
                    >
                      <span style={{ fontWeight: 600, marginRight: 8 }}>
                        {/* Folder Icon */}
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 20 20"
                          fill="none"
                          style={{ marginRight: 8, opacity: 0.7, marginBottom: "-2.5px" }}
                        >
                          <path
                            d="M2 5a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z"
                            stroke="#ddd"
                            strokeWidth="1.2"
                            fill="none"
                          />
                        </svg>
                      </span>
                      {result.item.name}
                      <span style={{ marginLeft: 8, fontSize: 12, color: '#aaa' }}>
                        (in {projects.find(p => p.id === result.item.project_id)?.name || 'Project'})
                      </span>
                    </li>
                  )
                )
              )
            ) : (
            <>
            {creatingProject && (
              <li style={{
                display: 'flex',
                alignItems: 'center',
                background: 'transparant',
                color: '#eee',
                padding: '6px 12px',
                borderRadius: 4,
                marginBottom: 2,
              }}>
                <form
                  style={{ flex: 1, display: 'flex', alignItems: 'center' }}
                  onSubmit={e => {
                    e.preventDefault();
                    onSaveNewProject(newProjectName);
                    setNewProjectName('');
                  }}
                >
                  <input
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    autoFocus
                    style={{ flex: 1, marginRight: 6, borderRadius: 4, border: '1px solid #555', background: '#333', padding: 4 }}
                    placeholder="Project name"
                    onBlur={() => {
                      if (newProjectName.trim()) {
                        onSaveNewProject(newProjectName);
                      } else {
                        onSaveNewProject('');
                      }
                      setNewProjectName('');
                    }}
                  />
                  <button type="submit" style={{ marginRight: 4 }}>Save</button>
                </form>
              </li>
            )}
            {filteredProjects.map(project => (
                <li
                  key={project.id}
                  className={project.id === selectedProjectId ? styles.selected : ''}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background:
                      project.id === selectedProjectId
                        ? '#333'
                        : hoveredProjectId === project.id
                        ? '#26292c' // Slightly darker on hover
                        : 'transparent',
                    color: '#eee',
                    padding: '14px 12px',
                    borderRadius: 4,
                    marginBottom: 2,
                  }}
                  onMouseEnter={() => setHoveredProjectId(project.id)}
                  onMouseLeave={() => setHoveredProjectId(null)}
                
        onDragOver={(e) => { try { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; } catch {} }}
                onDrop={(e) => {
                  try {
          e.preventDefault();
          e.stopPropagation();
                    const str = e.dataTransfer.getData('application/x-clipify-ids');
                    if (!str) return;
                    const payload = JSON.parse(str);
                    const detail = { ids: payload.ids || [], targetProjectId: project.id, targetFolderId: null };
                    const ev = new CustomEvent('clipboard-move-request', { detail });
                    window.dispatchEvent(ev);
                  } catch {}
                }}
                >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {renamingId === project.id ? (
                    <form
                      style={{ flex: 1, display: 'flex', alignItems: 'center' }}
                      onSubmit={e => {
                        e.preventDefault();
                        if (renameValue.trim()) {
                          onRename(project.id, renameValue.trim());
                        }
                        setRenamingId(null);
                      }}
                    >
                      <input
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        autoFocus
                        style={{ flex: 1, marginRight: 6, borderRadius: 4, border: '1px solid #ccc', padding: 4 }}
                        onBlur={() => setRenamingId(null)}
                      />
                      <button type="submit" style={{ marginRight: 4 }}>Save</button>
                    </form>
                  ) : (
                    <>
                      <span
                        className="project-title"
                        title={project.name}
                        style={{ cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center' }}
                      >
                        {/* Arrow: toggles folders */}
                        <span
                          style={{
                            marginRight: 11,
                            fontSize: 12,
                            color: (projectFolderCounts[project.id] || 0) > 0 ? '#ccc' : '#444', // Dim if no folders
                            cursor: (projectFolderCounts[project.id] || 0) > 0 ? 'pointer' : 'default'
                          }}
                          onClick={e => {
                            if (!((projectFolderCounts[project.id] || 0) > 0)) return; // Only toggle if folders exist
                            e.stopPropagation();
                            toggleProjectFolders(project.id);
                          }}
                          title={
                            (projectFolderCounts[project.id] || 0) > 0
                              ? (collapsedProjects[project.id] ? 'Show folders' : 'Hide folders')
                              : 'No folders'
                          }
                        >
                          {(projectFolderCounts[project.id] || 0) > 0
                            ? (collapsedProjects[project.id] ? '▶' : '▼')
                            : '▶'}
                        </span>
                        {/* Project name: selects project and shows clipboard */}
                        <span
                          onClick={() => onSelect && onSelect(project.id)}
                          style={{ flex: 1 }}
                        >
                          {project.name}
                        </span>
                      </span>
                      {(hoveredProjectId === project.id || project.id === selectedProjectId) && (
                        <div style={{
                          visibility: (hoveredProjectId === project.id || project.id === selectedProjectId) ? 'visible' : 'hidden',
                          height: 28,
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          <button
                            style={{
                              fontSize: 13,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: '#444',
                              color: '#fff',
                              border: 'none',
                              marginBottom: 4,
                              cursor: 'pointer'
                            }}
                          onClick={e => {
                            // Expand folders for this project if collapsed
                            if (collapsedProjects[project.id]) {
                              setCollapsedProjects(prev => ({ ...prev, [project.id]: false }));
                            }
                            // Always add folder to the intended project, regardless of selectedProjectId
                            onAddFolder(null, project.id);
                          }}
                          >
                            +
                          </button>
                          <button
                            title="Rename"
                            style={{ marginRight: 4 }}
                            onClick={() => {
                              setRenamingId(project.id);
                              setRenameValue(project.name);
                            }}
                          >✎</button>
                          <button
                            title="Delete"
                            onClick={() => onDelete && onDelete(project.id)}
                          >🗑</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {/* Folders for this project */}
                {!collapsedProjects[project.id] && (
                  <div>
                    {
                      // Build a stable per-project folders list that won't flicker to empty during refetch
                    }
                    {(() => {
                      const baseFolders = prevFoldersByProjectRef.current[project.id] || [];
                      const listForTree = search
                        ? baseFolders.filter(f => {
                            // Show folder if it matches search or is a parent of a matching folder within this project
                            if (f.name.toLowerCase().includes(search.toLowerCase())) return true;
                            const hasMatchingDescendant = baseFolders.some(desc =>
                              desc.name.toLowerCase().includes(search.toLowerCase()) &&
                              (function isDescendantFolder(localFolders, parentId, childId) {
                                let current = localFolders.find(ff => ff.id === childId);
                                while (current && current.parent_id) {
                                  if (current.parent_id === parentId) return true;
                                  current = localFolders.find(ff => ff.id === current.parent_id);
                                }
                                return false;
                              })(baseFolders, f.id, desc.id)
                            );
                            return hasMatchingDescendant;
                          })
                        : baseFolders;
                      return (
                        <FolderTree
                          folders={listForTree}
                          parentId={null}
                          selectedFolderId={selectedFolderId}
                          onSelect={onSelect}
                          onSelectFolder={onSelectFolder}
                          onAddFolder={onAddFolder}
                          onRenameFolder={onRenameFolder}
                          onDeleteFolder={onDeleteFolder}
                          renamingFolderId={renamingFolderId}
                          setRenamingFolderId={setRenamingFolderId}
                          renameFolderValue={renameFolderValue}
                          setRenameFolderValue={setRenameFolderValue}
                          projectId={project.id}
                          setFolderToDelete={setFolderToDelete}
                        />
                      );
                    })()}
                  </div>
                )}
              </li>
            ))}
            </>
            )}
          </ul>
        </div>
      </aside>
      <DeleteFolderModal
        open={!!folderToDelete}
        folderName={folderToDelete?.name}
        onCancel={() => setFolderToDelete(null)}
        onConfirm={() => {
          const deletedFolder = folderToDelete;
          // Mark which project's count is legitimately dropping
          if (deletedFolder?.project_id) {
            lastDeletedProjectIdRef.current = deletedFolder.project_id;
            lastDeletedFolderIdRef.current = deletedFolder.id;
          }
          onDeleteFolder(deletedFolder.id);
          setFolderToDelete(null);
          // Keep the project's expanded/collapsed state unchanged.
        }}
      />
    </>
  );
  
}