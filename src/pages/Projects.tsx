import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Project } from '../types';
import { useAuth } from '../AuthContext';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { Plus, Trash2, FolderKanban, X, Edit2 } from 'lucide-react';

export const Projects = () => {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newProject, setNewProject] = useState({ name: '', description: '', screens: '' });

  const openEdit = (project: Project) => {
    setNewProject({
      name: project.name,
      description: project.description || '',
      screens: project.screens?.join(', ') || ''
    });
    setEditingId(project.id);
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'projects'), (snapshot) => {
      const projs: Project[] = [];
      snapshot.forEach(doc => {
        projs.push({ id: doc.id, ...doc.data() } as Project);
      });
      setProjects(projs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'projects'));

    return () => unsub();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !(profile.roles?.includes('admin') || profile.role === 'admin')) return;

    try {
      await addDoc(collection(db, 'projects'), {
        name: newProject.name,
        description: newProject.description,
        screens: newProject.screens.split(',').map(s => s.trim()).filter(Boolean),
        createdBy: profile.uid,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewProject({ name: '', description: '', screens: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'projects');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !(profile.roles?.includes('admin') || profile.role === 'admin') || !editingId) return;

    try {
      await updateDoc(doc(db, 'projects', editingId), {
        name: newProject.name,
        description: newProject.description,
        screens: newProject.screens.split(',').map(s => s.trim()).filter(Boolean),
      });
      setEditingId(null);
      setNewProject({ name: '', description: '', screens: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${editingId}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!profile || !(profile.roles?.includes('admin') || profile.role === 'admin')) return;
    try {
      await deleteDoc(doc(db, 'projects', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Projects</h1>
          <p className="text-gray-400 mt-1">Manage Power Apps projects.</p>
        </div>
        {(profile?.roles?.includes('admin') || profile?.role === 'admin') && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold py-2 px-4 rounded-xl flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Project
          </button>
        )}
      </div>

      {(isAdding || editingId) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md relative shadow-2xl">
            <button onClick={() => { setIsAdding(false); setEditingId(null); setNewProject({ name: '', description: '', screens: '' }); }} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-white mb-4">{editingId ? 'Edit Project' : 'Add New Project'}</h2>
            <form onSubmit={editingId ? handleUpdate : handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  required
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                  value={newProject.name}
                  onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                <textarea
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                  value={newProject.description}
                  onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Screens (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Dashboard, Details, Profile"
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                  value={newProject.screens}
                  onChange={e => setNewProject({ ...newProject, screens: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setEditingId(null); setNewProject({ name: '', description: '', screens: '' }); }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition-colors"
                >
                  {editingId ? 'Update Project' : 'Save Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(project => (
          <div key={project.id} className="bg-[#111] border border-white/10 rounded-2xl p-6 relative group hover:border-cyan-500/50 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                {(profile?.roles?.includes('admin') || profile?.role === 'admin') && (
                  <>
                    <button onClick={() => openEdit(project)} className="text-gray-500 hover:text-cyan-400 p-1.5 rounded-lg hover:bg-cyan-500/10 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(project.id)} className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{project.name}</h3>
            <p className="text-gray-400 text-sm line-clamp-2">{project.description || 'No description provided.'}</p>
            {project.screens && project.screens.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {project.screens.slice(0, 4).map(s => (
                  <span key={s} className="text-[10px] bg-white/10 border border-white/5 text-gray-300 px-2 py-1 rounded-md">{s}</span>
                ))}
                {project.screens.length > 4 && <span className="text-[10px] text-gray-500 px-1 py-1">+{project.screens.length - 4} more</span>}
              </div>
            )}
          </div>
        ))}
        {projects.length === 0 && !isAdding && (
          <div className="col-span-full text-center py-12 text-gray-500 border border-dashed border-white/10 rounded-2xl">
            No projects found.
          </div>
        )}
      </div>
    </div>
  );
};
