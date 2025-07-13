import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useFolders(user, selectedProjectId) {
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [renameFolderValue, setRenameFolderValue] = useState('');

  useEffect(() => {
    if (!user || !selectedProjectId) {
      setFolders([]);
      return;
    }
    const fetchFolders = async () => {
      const { data } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', user.id);
      setFolders(data || []);
    };
    fetchFolders();
  }, [user, selectedProjectId]);

  const addFolder = async (parentId, projectId) => {
    if (!user || !selectedProjectId) return;
    const { data, error } = await supabase
      .from('folders')
      .insert([{
         project_id: selectedProjectId,
         name: 'New Folder',
         parent_id: parentId,
         created_at: new Date(),
         user_id: user.id // <-- Add this!
       }])
      .select();
    if (!error && data && data.length > 0) {
      setFolders([...folders, ...data]);
      setRenamingFolderId(data[0].id);
      setRenameFolderValue('New Folder');
    }
  };

  const renameFolder = async (folderId, newName) => {
    if (!user || !selectedProjectId || !folderId || !newName.trim()) return;
    const { error } = await supabase
        .from('folders')
        .update({ name: newName.trim() })
        .eq('id', folderId);
    if (error) {
        console.error('Rename folder error:', error.message);
        return;
    }
    const { data } = await supabase
        .from('folders')
        .select('*')
        .eq('project_id', selectedProjectId);
    setFolders(data || []);  
    setRenamingFolderId(null);
    setRenameFolderValue('');
  };

  const deleteFolder = async (folderId) => {
    if (!user || !selectedProjectId || !folderId) return;
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', folderId);
    if (!error) {
      const { data } = await supabase
        .from('folders')
        .select('*')
        .eq('project_id', selectedProjectId);
      setFolders(data || []);
      if (selectedFolderId === folderId) setSelectedFolderId(null);
    }
  };

  return {
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
  };
}