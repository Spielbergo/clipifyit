import React, { useState, useEffect } from 'react';

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
  renamingFolderId,
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
          <li key={folder.id} style={{ marginBottom: 2 }}>
            {renamingFolderId === folder.id ? (
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
                      stroke="#ddd"
                      strokeWidth="1.2"
                      fill="none"
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

  // Folder rename state
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [renameFolderValue, setRenameFolderValue] = useState('');

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
    setCollapsedProjects(prev => {
      // If projects were added/removed, add new keys but keep user state for existing ones
      const next = { ...prev };
      projects.forEach(p => {
        if (!(p.id in next)) next[p.id] = false; // default to expanded
      });
      // Remove collapsed states for deleted projects
      Object.keys(next).forEach(id => {
        if (!projects.find(p => p.id === id)) delete next[id];
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
                            color: folders.some(f => f.project_id === project.id) ? '#ccc' : '#444', // Dim if no folders
                            cursor: folders.some(f => f.project_id === project.id) ? 'pointer' : 'default'
                          }}
                          onClick={e => {
                            if (!folders.some(f => f.project_id === project.id)) return; // Only toggle if folders exist
                            e.stopPropagation();
                            toggleProjectFolders(project.id);
                          }}
                          title={
                            folders.some(f => f.project_id === project.id)
                              ? (collapsedProjects[project.id] ? 'Show folders' : 'Hide folders')
                              : 'No folders'
                          }
                        >
                          {collapsedProjects[project.id] ? '▶' : '▼'}
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
                              // Select this project before adding a folder
                              if (onSelect) onSelect(project.id);
                              // Expand folders for this project if collapsed
                              if (collapsedProjects[project.id]) {
                                setCollapsedProjects(prev => ({ ...prev, [project.id]: false }));
                              }
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
                    <FolderTree
                      folders={
                        search
                          ? folders.filter(f => {
                              if (f.project_id !== project.id) return false;
                              // Show folder if it matches search or is a parent of a matching folder
                              if (f.name.toLowerCase().includes(search.toLowerCase())) return true;
                              // Check if any descendant matches
                              const hasMatchingDescendant = folders.some(desc =>
                                desc.project_id === project.id &&
                                desc.name.toLowerCase().includes(search.toLowerCase()) &&
                                isDescendantFolder(folders, f.id, desc.id)
                              );
                              return hasMatchingDescendant;
                            })
                          : folders
                      }
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
          onDeleteFolder(deletedFolder.id);
          setFolderToDelete(null);
          // Only update the collapsed state for the affected project, never touch others
          setTimeout(() => {
            const remainingFolders = folders.filter(f => f.project_id === deletedFolder.project_id && f.id !== deletedFolder.id);
            setCollapsedProjects(prev => {
              // Only update the affected project, leave others untouched
              return {
                ...prev,
                [deletedFolder.project_id]: remainingFolders.length === 0 ? false : prev[deletedFolder.project_id]
              };
            });
          }, 0);
        }}
      />
    </>
  );
  
}