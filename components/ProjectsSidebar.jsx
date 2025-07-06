import React, { useState } from 'react';

import DeleteFolderModal from './DeleteFolderModal';

// Recursive folder tree component
function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
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
                  onClick={() => onSelectFolder(folder.id)}
                  title={folder.name}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 20 20"
                    fill="none"
                    style={{ marginRight: 4, opacity: 0.7 }}
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

  // Folder rename state
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [renameFolderValue, setRenameFolderValue] = useState('');

  // Sorting logic
  let sortedProjects = [...projects];

  if (sortMode === 'alpha') {
    sortedProjects.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortMode === 'descAlpha') {
    sortedProjects.sort((a, b) => b.name.localeCompare(a.name));
  } else if (sortMode === 'oldest') {
    sortedProjects.sort((a, b) => a.createdAt - b.createdAt);
  } else if (sortMode === 'latest') {
    sortedProjects.sort((a, b) => b.createdAt - a.createdAt);
  }

  const filteredProjects = sortedProjects.filter(project =>
    project.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleProjectFolders = (projectId) => {
    setCollapsedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  return (
    <>
      <aside className={`projects-sidebar${expanded ? ' expanded' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 18 }}>Projects</span>
          {onClose && (
            <button className="close-btn" onClick={onClose} style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer' }}>
              ×
            </button>
          )}
        </div>
        {/* Sort Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, margin: '0 0 8px 0' }}>
          <button
            style={{ fontWeight: sortMode === 'alpha' || sortMode === 'descAlpha' ? 700 : 400 }}
            onClick={() => setSortMode(sortMode === 'alpha' ? 'descAlpha' : 'alpha')}
            title={sortMode === 'alpha' ? "Sort Z-A" : "Sort A-Z"}
          >
            {sortMode === 'alpha' ? 'A-Z' : 'Z-A'}
          </button>
          <button
            style={{ fontWeight: sortMode === 'oldest' ? 700 : 400 }}
            onClick={() => setSortMode('oldest')}
            title="Sort by oldest"
          >Oldest</button>
          <button
            style={{ fontWeight: sortMode === 'latest' ? 700 : 400 }}
            onClick={() => setSortMode('latest')}
            title="Sort by latest"
          >Latest</button>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', margin: '0 0 12px 0', padding: '0 13px' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects..."
            style={{
              width: '100%',
              padding: '8px 36px 8px 12px',
              color: '#eee',
              borderRadius: '20px',
              border: '1px solid #666',
              outline: 'none',
              fontSize: '15px',
              background: '#333',
              boxSizing: 'border-box'
            }}
          />
          <span style={{
            position: 'absolute',
            right: 26,
            top: '55%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: '#888'
          }}>
            {/* SVG search icon */}
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="7" stroke="#888" strokeWidth="2"/>
              <line x1="14.2" y1="14.2" x2="18" y2="18" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </span>
        </div>

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
        <ul style={{ padding: '0 15px', margin: 0 }}>
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
              className={project.id === selectedProjectId ? 'selected' : ''}
              style={{
                display: 'flex',
                flexDirection: 'column',
                background: project.id === selectedProjectId ? '#333' : 'transparent',
                color: '#eee',
                padding: '6px 12px',
                borderRadius: 4,
                marginBottom: 2,
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
            onClick={() => {
              onSelect && onSelect(project.id);
              toggleProjectFolders(project.id);
            }}
            style={{ cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center' }}
          >
            <span style={{ marginRight: 6, fontSize: 9, color: '#ccc' }}>
              {collapsedProjects[project.id] ? '▶' : '▼'}
            </span>
            {project.name}
          </span>
          <div>
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
              onClick={() => onAddFolder(null)}
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
        </>
      )}
    </div>
    {/* Folders for this project */}
    {project.id === selectedProjectId && !collapsedProjects[project.id] && (
      <div style={{ marginTop: 4 }}>
        <FolderTree
          folders={folders}
          parentId={null}
          selectedFolderId={selectedFolderId}
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
        </ul>
      </aside>
      <DeleteFolderModal
        open={!!folderToDelete}
        folderName={folderToDelete?.name}
        onCancel={() => setFolderToDelete(null)}
        onConfirm={() => {
          onDeleteFolder(folderToDelete.id);
          setFolderToDelete(null);
        }}
      />
    </>
  );
  
}