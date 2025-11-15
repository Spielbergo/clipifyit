import React, { useState, useEffect, useRef } from 'react';
import { FiChevronsDown, FiChevronsUp } from 'react-icons/fi';

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
    <ul className={parentId ? styles.folderTreeChild : styles.folderTreeRoot}>
      {folders
        .filter(folder => folder.parent_id === parentId && folder.project_id === projectId)
        .map(folder => (
          <li
            key={folder.id}
            className={styles.folderListItem}
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
                className={styles.folderRenameForm}
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
                  className={styles.folderRenameInput}
                />
                <button type="submit" className={styles.mr4}>
                  Save
                </button>
              </form>
            ) : (
              <div className={styles.folderRenameForm}>
                <span
                  className={`${styles.folderName} ${folder.id === selectedFolderId ? styles.folderNameSelected : ''}`}
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
                    className={styles.folderIcon}
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
                  className={styles.mr4}
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

  // Compute global expand/collapse state
  const allExpanded = projects.length > 0 && projects.every(p => collapsedProjects[p.id] === false);
  const anyCollapsed = projects.some(p => collapsedProjects[p.id]);

  const toggleAllProjects = () => {
    setCollapsedProjects(prev => {
      const expand = projects.some(p => prev[p.id]); // if any collapsed, expand all; else collapse all
      const next = { ...(prev || {}) };
      projects.forEach(p => { next[p.id] = expand ? false : true; });
      return next;
    });
  };

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
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarHeaderLeft}>
              <span className={styles.projectsTitle}>Projects</span>
            </div>
            <div className={styles.sidebarHeaderRight}>
              <button
                onClick={toggleAllProjects}
                title={anyCollapsed ? 'Expand all projects' : 'Collapse all projects'}
                aria-label={anyCollapsed ? 'Expand all projects' : 'Collapse all projects'}
                className={styles.collapseAllBtn}
              >
                {anyCollapsed ? <FiChevronsDown size={16} /> : <FiChevronsUp size={16} />}
              </button>
              {onClose && (
                <button className={`close-btn ${styles.closeBtn}`} onClick={onClose}>
                  ×
                </button>
              )}
            </div>
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
            className={styles.newProjectBtn}
            disabled={creatingProject}
          >
            + New Project
          </button>
        </div>
        <div className={styles.projects_list__scroll}>
          <ul className={styles.projectsList}>
            {search ? (
              flatSearchResults.length === 0 ? (
                <li className={styles.noResults}>No results</li>
              ) : (
                flatSearchResults.map(result =>
                  result.type === 'project' ? (
                    <li
                      key={`project-${result.item.id}`}
                      className={`${styles.searchResultItem} ${styles.searchResultProject}`}
                      onClick={() => {
                        setSearch('');
                        onSelect && onSelect(result.item.id);
                      }}
                    >
                      <span className={styles.projectsTitle} style={{ fontSize: 16, marginRight: 8 }}>
                        {/* Folder ICon */}
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 20 20"
                          fill="none"
                          className={styles.folderIcon}
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
                      className={`${styles.searchResultItem} ${styles.searchResultFolder}`}
                      onClick={() => {
                        setSearch('');
                        onSelect && onSelect(result.item.project_id);
                        onSelectFolder && onSelectFolder(result.item.id);
                      }}
                    >
                      <span className={styles.projectsTitle} style={{ fontSize: 16, marginRight: 8 }}>
                        {/* Folder Icon */}
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 20 20"
                          fill="none"
                          className={styles.folderIcon}
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
              <li className={styles.creatingProjectItem}>
                <form
                  className={styles.creatingProjectForm}
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
                    className={styles.creatingProjectInput}
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
                  <button type="submit" className={styles.mr4}>Save</button>
                </form>
              </li>
            )}
            {filteredProjects.map(project => (
                <li
                  key={project.id}
                  className={[
                    styles.projectItem,
                    project.id === selectedProjectId ? styles.projectItemSelected : '',
                    hoveredProjectId === project.id && project.id !== selectedProjectId ? styles.projectItemHover : ''
                  ].join(' ').trim()}
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
                <div className={styles.projectTopRow}>
                  {renamingId === project.id ? (
                    <form
                      className={styles.creatingProjectForm}
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
                        className={styles.folderRenameInput}
                        onBlur={() => setRenamingId(null)}
                      />
                      <button type="submit" className={styles.mr4}>Save</button>
                    </form>
                  ) : (
                    <>
                      <span
                        title={project.name}
                        className={`project-title ${styles.projectTitle}`}
                      >
                        {/* Arrow: toggles folders */}
                        <span
                          className={`${styles.projectToggle} ${(projectFolderCounts[project.id] || 0) > 0 ? styles.projectToggleActive : styles.projectToggleInactive}`}
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
                          className={styles.projectTitleText}
                        >
                          {project.name}
                        </span>
                      </span>
                      {(hoveredProjectId === project.id || project.id === selectedProjectId) && (
                        <div className={styles.projectActions} style={{ visibility: (hoveredProjectId === project.id || project.id === selectedProjectId) ? 'visible' : 'hidden' }}>
                          <button
                            className={styles.addFolderBtn}
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
                            className={styles.mr4}
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