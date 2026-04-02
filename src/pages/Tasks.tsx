import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Task, Project, User, TaskStatus } from '../types';
import { useAuth } from '../AuthContext';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { Plus, Trash2, CheckSquare, Edit2, X, Filter, Archive, Clock, MessageSquare, Send as SendIcon } from 'lucide-react';

export const Tasks = () => {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({ title: '', description: '', projectId: '', assigneeIds: [] as string[], status: 'todo' as TaskStatus, percentage: 0, screen: '' });
  const [showBacklog, setShowBacklog] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState<string>('');
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const ts: Task[] = [];
      snapshot.forEach(doc => ts.push({ id: doc.id, ...doc.data() } as Task));
      setTasks(ts);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'tasks'));

    const unsubProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
      const ps: Project[] = [];
      snapshot.forEach(doc => ps.push({ id: doc.id, ...doc.data() } as Project));
      setProjects(ps);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'projects'));

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const us: User[] = [];
      snapshot.forEach(doc => us.push({ uid: doc.id, ...doc.data() } as User));
      setUsers(us);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    return () => { unsubTasks(); unsubProjects(); unsubUsers(); };
  }, []);

  const isPMOrAdmin = profile?.roles?.includes('admin') || profile?.role === 'admin' || profile?.roles?.includes('project_manager') || profile?.role === 'project_manager';
  const isAdmin = profile?.roles?.includes('admin') || profile?.role === 'admin';

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPMOrAdmin) return;

    try {
      await addDoc(collection(db, 'tasks'), {
        ...newTask,
        createdBy: profile.uid,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewTask({ title: '', description: '', projectId: '', assigneeIds: [], status: 'todo', percentage: 0, screen: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    try {
      const { id, ...data } = editingTask;
      const oldTask = tasks.find(t => t.id === id);

      const updateData: any = { ...data };
      if (oldTask?.status !== 'in-progress' && data.status === 'in-progress' && !oldTask?.startedAt) {
        updateData.startedAt = serverTimestamp();
      }
      if (oldTask?.status !== 'completed' && data.status === 'completed') {
        updateData.completedAt = serverTimestamp();
      }

      await updateDoc(doc(db, 'tasks', id), updateData);
      setEditingTask(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${editingTask.id}`);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !newComment.trim() || !profile) return;

    const comment = {
      id: crypto.randomUUID(),
      text: newComment.trim(),
      createdBy: profile.uid,
      createdAt: Date.now()
    };

    try {
      const updatedComments = [...(editingTask.comments || []), comment];
      await updateDoc(doc(db, 'tasks', editingTask.id), { comments: updatedComments });
      setEditingTask({ ...editingTask, comments: updatedComments });
      setNewComment('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${editingTask.id}/comments`);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!editingTask || !profile) return;

    const comment = editingTask.comments?.find(c => c.id === commentId);
    if (!comment) return;
    if (!isPMOrAdmin && comment.createdBy !== profile.uid) return;

    try {
      const updatedComments = editingTask.comments?.filter(c => c.id !== commentId) || [];
      await updateDoc(doc(db, 'tasks', editingTask.id), { comments: updatedComments });
      setEditingTask({ ...editingTask, comments: updatedComments });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${editingTask.id}/comments`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tasks/${id}`);
    }
  };

  const statuses: TaskStatus[] = ['todo', 'in-progress', 'completed', 'testing'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Tasks</h1>
          <p className="text-gray-400 mt-1">Manage and assign development tasks.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterAssignee}
              onChange={e => setFilterAssignee(e.target.value)}
              className="bg-transparent text-sm text-white focus:outline-none"
            >
              <option value="" className="bg-[#111] text-white">All Developers</option>
              {users.filter(u => u.roles?.includes('developer') || u.role === 'developer').map(u => <option key={u.uid} value={u.uid} className="bg-[#111] text-white">{u.displayName || u.email}</option>)}
            </select>
          </div>
          <button
            onClick={() => setShowBacklog(!showBacklog)}
            className={`font-semibold py-2 px-4 rounded-xl flex items-center gap-2 transition-colors ${showBacklog ? 'bg-orange-500 text-black hover:bg-orange-400' : 'bg-[#111] text-gray-300 hover:text-white border border-white/10'}`}
          >
            <Archive className="w-5 h-5" />
            {showBacklog ? 'View Dashboard' : 'View Backlog'}
          </button>
          {isPMOrAdmin && (
            <button
              onClick={() => setIsAdding(true)}
              className="bg-purple-500 hover:bg-purple-400 text-black font-semibold py-2 px-4 rounded-xl flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Task
            </button>
          )}
        </div>
      </div>

      {(isAdding || editingTask) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 lg:items-start lg:pt-10">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative shadow-2xl custom-scrollbar">
            <button onClick={() => { setIsAdding(false); setEditingTask(null); }} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-white mb-4">{isAdding ? 'Add New Task' : 'Edit Task'}</h2>
            <form id="task-form" onSubmit={isAdding ? handleAdd : handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  disabled={!isPMOrAdmin}
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
                  value={isAdding ? newTask.title : editingTask?.title || ''}
                  onChange={e => isAdding ? setNewTask({ ...newTask, title: e.target.value }) : setEditingTask({ ...editingTask!, title: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                <textarea
                  disabled={!isPMOrAdmin}
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
                  value={isAdding ? newTask.description : editingTask?.description || ''}
                  onChange={e => isAdding ? setNewTask({ ...newTask, description: e.target.value }) : setEditingTask({ ...editingTask!, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Project</label>
                <select
                  required
                  disabled={!isPMOrAdmin}
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
                  value={isAdding ? newTask.projectId : editingTask?.projectId || ''}
                  onChange={e => isAdding ? setNewTask({ ...newTask, projectId: e.target.value }) : setEditingTask({ ...editingTask!, projectId: e.target.value })}
                >
                  <option value="" disabled>Select Project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Screen</label>
                <input
                  type="text"
                  list="screens-list"
                  disabled={!isPMOrAdmin || (!isAdding ? !editingTask?.projectId : !newTask.projectId)}
                  placeholder="Select or type a screen"
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
                  value={isAdding ? (newTask.screen || '') : (editingTask?.screen || '')}
                  onChange={e => {
                    if (isAdding) setNewTask({ ...newTask, screen: e.target.value });
                    else setEditingTask({ ...editingTask!, screen: e.target.value });
                  }}
                />
                <datalist id="screens-list">
                  {projects.find(p => p.id === (isAdding ? newTask.projectId : editingTask?.projectId))?.screens?.map(s => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">Assignees</label>
                <div className={`w-full bg-black border border-white/10 rounded-lg px-4 py-2 ${!isPMOrAdmin ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="max-h-32 overflow-y-auto custom-scrollbar flex flex-col gap-2">
                    {users.filter(u => u.roles?.includes('developer') || u.role === 'developer').map(u => {
                      const currentIds = isAdding ? newTask.assigneeIds : (editingTask?.assigneeIds || (editingTask?.assigneeId ? [editingTask.assigneeId] : []));
                      const isChecked = currentIds.includes(u.uid);
                      return (
                        <label key={u.uid} className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const updated = e.target.checked ? [...currentIds, u.uid] : currentIds.filter(id => id !== u.uid);
                              if (isAdding) setNewTask({ ...newTask, assigneeIds: updated });
                              else setEditingTask({ ...editingTask!, assigneeIds: updated });
                            }}
                            className="w-4 h-4 rounded border-white/10 bg-black text-purple-500 focus:ring-purple-500 cursor-pointer"
                          />
                          {u.displayName || u.email}
                        </label>
                      );
                    })}
                    {users.filter(u => u.roles?.includes('developer') || u.role === 'developer').length === 0 && (
                      <span className="text-gray-500 text-sm">No developers found.</span>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                <select
                  required
                  disabled={!isPMOrAdmin}
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
                  value={isAdding ? newTask.status : editingTask?.status || 'todo'}
                  onChange={e => isAdding ? setNewTask({ ...newTask, status: e.target.value as TaskStatus }) : setEditingTask({ ...editingTask!, status: e.target.value as TaskStatus })}
                >
                  <option value="backlog">BACKLOG</option>
                  <option value="todo">TODO</option>
                  <option value="in-progress">IN-PROGRESS</option>
                  <option value="testing">TESTING</option>
                  <option value="completed">COMPLETED</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Progress (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  value={isAdding ? (newTask.percentage || 0) : (editingTask?.percentage || 0)}
                  onChange={e => {
                    const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                    if (isAdding) setNewTask({ ...newTask, percentage: val });
                    else setEditingTask({ ...editingTask!, percentage: val });
                  }}
                />
              </div>
            </form>

            <div className="md:col-span-2 flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => { setIsAdding(false); setEditingTask(null); }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="task-form"
                className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-black font-semibold rounded-lg transition-colors"
              >
                {isAdding ? 'Save Task' : 'Update Task'}
              </button>
            </div>

            {!isAdding && editingTask && (
              <div className="mt-8 border-t border-white/10 pt-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-purple-400" />
                  Comments
                </h3>
                <div className="space-y-4 mb-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                  {editingTask.comments?.length ? editingTask.comments.map(c => {
                    const user = users.find(u => u.uid === c.createdBy);
                    const canDeleteComment = isPMOrAdmin || profile?.uid === c.createdBy;
                    return (
                      <div key={c.id} className="bg-black/50 rounded-xl p-3 border border-white/5 group">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-sm text-purple-400">{user?.displayName || user?.email || 'Unknown User'}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleString()}</span>
                            {canDeleteComment && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(c.id)}
                                className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete comment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{c.text}</p>
                      </div>
                    );
                  }) : (
                    <div className="text-sm text-gray-500 text-center py-2">No comments yet.</div>
                  )}
                </div>
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a comment..."
                    className="flex-1 bg-black border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="bg-white/10 hover:bg-white/20 text-white p-2 w-10 h-10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
                  >
                    <SendIcon className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div >
      )}

      <div className={`grid grid-cols-1 md:grid-cols-2 ${showBacklog ? 'lg:grid-cols-1' : 'lg:grid-cols-4'} gap-6`}>
        {(showBacklog ? (['backlog'] as TaskStatus[]) : statuses).map(status => (
          <div key={status} className="bg-[#111] border border-white/10 rounded-2xl p-4 flex flex-col h-[calc(100vh-200px)]">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${status === 'backlog' ? 'bg-orange-500' : status === 'todo' ? 'bg-gray-500' : status === 'in-progress' ? 'bg-blue-500' : status === 'testing' ? 'bg-yellow-500' : 'bg-green-500'}`} />
              {status}
            </h3>
            <div className={`flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar ${showBacklog ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 space-y-0' : ''}`}>
              {tasks.filter(t => {
                const assignedTo = t.assigneeIds || (t.assigneeId ? [t.assigneeId] : []);
                return t.status === status && (filterAssignee ? assignedTo.includes(filterAssignee) : true);
              }).map(task => {
                const isAssigned = (task.assigneeIds || (task.assigneeId ? [task.assigneeId] : [])).includes(profile?.uid || '');
                const canEdit = isPMOrAdmin || ((profile?.roles?.includes('developer') || profile?.role === 'developer') && isAssigned);

                return (
                  <div key={task.id} className="bg-black border border-white/10 rounded-xl p-4 group hover:border-purple-500/50 transition-colors flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-white font-medium">{task.title}</h4>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-2">
                        {canEdit && (
                          <button onClick={() => setEditingTask(task)} className="text-gray-500 hover:text-purple-400"><Edit2 className="w-4 h-4" /></button>
                        )}
                        {isAdmin && (
                          <button onClick={() => handleDelete(task.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2 pb-1 flex-1">{task.description}</p>

                    <div className="mb-3">
                      <div className="flex justify-between text-[10px] text-gray-400 mb-1 font-medium">
                        <span>Progress</span>
                        <span>{task.percentage || 0}%</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full transition-all duration-300" style={{ width: `${task.percentage || 0}%` }} />
                      </div>
                    </div>

                    {(task.startedAt || task.completedAt) && (
                      <div className="flex flex-col gap-1 mb-3 text-[10px] text-gray-500 border-t border-white/5 pt-2">
                        {task.startedAt && <div><span className="text-gray-400">Started:</span> {task.startedAt.toDate().toLocaleDateString()}</div>}
                        {task.completedAt && <div><span className="text-gray-400">Completed:</span> {task.completedAt.toDate().toLocaleDateString()}</div>}
                      </div>
                    )}

                    <div className="flex justify-between items-center text-xs mt-auto pt-2 border-t border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="bg-white/5 text-gray-400 px-2 py-1 rounded-md max-w-[100px] truncate">
                            {projects.find(p => p.id === task.projectId)?.name || 'Unknown Project'}
                          </span>
                          {task.screen && (
                            <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-1 rounded-md max-w-[100px] truncate" title={task.screen}>
                              {task.screen}
                            </span>
                          )}
                        </div>
                        {task.comments && task.comments.length > 0 && (
                          <span className="flex items-center gap-1 text-gray-400" title={`${task.comments.length} Comments`}>
                            <MessageSquare className="w-3 h-3" />
                            {task.comments.length}
                          </span>
                        )}
                      </div>
                      <div className="flex -space-x-2">
                        {(task.assigneeIds || (task.assigneeId ? [task.assigneeId] : [])).map(id => {
                          const dev = users.find(u => u.uid === id);
                          if (!dev) return null;
                          const label = dev.displayName || dev.email || 'U';
                          return (
                            <div key={id} className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold ring-2 ring-black" title={label}>
                              {label.charAt(0).toUpperCase()}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
              {tasks.filter(t => {
                const assignedTo = t.assigneeIds || (t.assigneeId ? [t.assigneeId] : []);
                return t.status === status && (filterAssignee ? assignedTo.includes(filterAssignee) : true);
              }).length === 0 && (
                  <div className="text-gray-600 text-sm text-center py-4 col-span-full">No tasks found.</div>
                )}
            </div>
          </div>
        ))}
      </div>
    </div >
  );
};
