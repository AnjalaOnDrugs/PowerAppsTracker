import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Deployment, Project, Task, Environment } from '../types';
import { useAuth } from '../AuthContext';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { Plus, Trash2, Rocket, UploadCloud, Download, ArrowRight, CheckSquare, X, ChevronDown, ChevronUp, Calendar } from 'lucide-react';

export const Deployments = () => {
  const { profile } = useAuth();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newDeployment, setNewDeployment] = useState({ projectId: '', version: '', powerAppsVersion: '', environment: 'dev' as Environment, taskIds: [] as string[] });
  const [file, setFile] = useState<File | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const unsubDeployments = onSnapshot(collection(db, 'deployments'), (snapshot) => {
      const ds: Deployment[] = [];
      snapshot.forEach(doc => ds.push({ id: doc.id, ...doc.data() } as Deployment));
      setDeployments(ds);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'deployments'));

    const unsubProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
      const ps: Project[] = [];
      snapshot.forEach(doc => ps.push({ id: doc.id, ...doc.data() } as Project));
      setProjects(ps);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'projects'));

    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const ts: Task[] = [];
      snapshot.forEach(doc => ts.push({ id: doc.id, ...doc.data() } as Task));
      setTasks(ts);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'tasks'));

    return () => { unsubDeployments(); unsubProjects(); unsubTasks(); };
  }, []);

  const isDeployerOrAdmin = profile?.roles?.includes('admin') || profile?.role === 'admin' || profile?.roles?.includes('deployer') || profile?.role === 'deployer';
  const isAdmin = profile?.roles?.includes('admin') || profile?.role === 'admin';

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDeployerOrAdmin) return;

    try {
      setUploading(true);
      let fileUrl = '';
      let fileName = '';

      if (file) {
        const fileRef = ref(storage, `deployments/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        fileUrl = await getDownloadURL(fileRef);
        fileName = file.name;
      }

      await addDoc(collection(db, 'deployments'), {
        ...newDeployment,
        fileUrl,
        fileName,
        createdBy: profile.uid,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewDeployment({ projectId: '', version: '', powerAppsVersion: '', environment: 'dev', taskIds: [] });
      setFile(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'deployments');
    } finally {
      setUploading(false);
    }
  };

  const handlePromote = async (deployment: Deployment, targetEnv: Environment) => {
    if (!isDeployerOrAdmin) return;
    try {
      const updateData: any = { environment: targetEnv };
      if (targetEnv === 'stage') {
        updateData.promotedToStageAt = serverTimestamp();
      } else if (targetEnv === 'prod') {
        updateData.promotedToProdAt = serverTimestamp();
      }
      await updateDoc(doc(db, 'deployments', deployment.id), updateData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `deployments/${deployment.id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isDeployerOrAdmin) return;
    const deployment = deployments.find(d => d.id === id);
    if (!deployment) return;

    try {
      if (deployment.fileUrl) {
        try {
          const fileRef = ref(storage, deployment.fileUrl);
          await deleteObject(fileRef);
        } catch (storageError) {
          console.error('Failed to delete file from storage:', storageError);
        }
      }
      await deleteDoc(doc(db, 'deployments', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `deployments/${id}`);
    }
  };

  const environments: Environment[] = ['dev', 'stage', 'prod'];

  // Tasks already bundled into completely existing deployments shouldn't be re-selected
  const assignedTaskIds = new Set(deployments.flatMap(d => d.taskIds || []));
  const availableTasks = tasks.filter(t => t.projectId === newDeployment.projectId && !assignedTaskIds.has(t.id));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Deployments</h1>
          <p className="text-gray-400 mt-1">Manage Power Apps deployments across environments.</p>
        </div>
        {isDeployerOrAdmin && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-green-500 hover:bg-green-400 text-black font-semibold py-2 px-4 rounded-xl flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Deployment
          </button>
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-2xl relative shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={() => setIsAdding(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-white mb-4">Create Deployment</h2>
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Project</label>
                <select
                  required
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
                  value={newDeployment.projectId}
                  onChange={e => setNewDeployment({ ...newDeployment, projectId: e.target.value })}
                >
                  <option value="" disabled>Select Project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Environment</label>
                <select
                  required
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
                  value={newDeployment.environment}
                  onChange={e => setNewDeployment({ ...newDeployment, environment: e.target.value as Environment })}
                >
                  {environments.map(e => <option key={e} value={e}>{e.toUpperCase()}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Deployment Version</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. v1.0.0"
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
                  value={newDeployment.version}
                  onChange={e => setNewDeployment({ ...newDeployment, version: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Power Apps Version</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1.0.0.12"
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
                  value={newDeployment.powerAppsVersion}
                  onChange={e => setNewDeployment({ ...newDeployment, powerAppsVersion: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">Included Tasks</label>
                <div className="bg-black border border-white/10 rounded-lg p-4 max-h-48 overflow-y-auto custom-scrollbar">
                  {!newDeployment.projectId ? (
                    <p className="text-gray-500 text-sm">Select a project to see tasks.</p>
                  ) : availableTasks.length === 0 ? (
                    <p className="text-gray-500 text-sm">All tasks in this project are either uncreated or already bundled into other deployments.</p>
                  ) : (
                    availableTasks.map(task => (
                      <label key={task.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-green-500 bg-black border-white/20 rounded focus:ring-green-500 focus:ring-2"
                          checked={newDeployment.taskIds.includes(task.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setNewDeployment({ ...newDeployment, taskIds: [...newDeployment.taskIds, task.id] });
                            } else {
                              setNewDeployment({ ...newDeployment, taskIds: newDeployment.taskIds.filter(id => id !== task.id) });
                            }
                          }}
                        />
                        <span className="text-white text-sm">{task.title}</span>
                        <span className="text-xs text-gray-500 ml-auto">{task.status.toUpperCase()}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">Deployment File (.zip)</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/10 border-dashed rounded-lg cursor-pointer bg-black hover:bg-white/5 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                      <p className="text-xs text-gray-500">ZIP file (MAX. 10MB)</p>
                    </div>
                    <input type="file" className="hidden" accept=".zip" onChange={e => setFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
                {file && <p className="text-sm text-green-400 mt-2 flex items-center gap-2"><CheckSquare className="w-4 h-4" /> {file.name}</p>}
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-green-500 hover:bg-green-400 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {uploading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : null}
                  {uploading ? 'Uploading...' : 'Create Deployment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {environments.map(env => (
          <div key={env} className="bg-[#111] border border-white/10 rounded-2xl p-4 flex flex-col h-[calc(100vh-200px)]">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${env === 'dev' ? 'bg-blue-500' : env === 'stage' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                {env}
              </span>
              <span className="text-xs bg-white/10 px-2 py-1 rounded-full text-gray-400">
                {deployments.filter(d => d.environment === env).length}
              </span>
            </h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {deployments.filter(d => d.environment === env).map(deployment => (
                <div key={deployment.id} className="bg-black border border-white/10 rounded-xl p-5 group hover:border-green-500/50 transition-colors relative">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-white font-bold text-lg flex items-center gap-2">
                        <Rocket className="w-4 h-4 text-green-400" />
                        {deployment.version}
                      </h4>
                      <p className="text-xs text-gray-400 mt-1">
                        {projects.find(p => p.id === deployment.projectId)?.name || 'Unknown Project'}
                      </p>
                    </div>
                    {isDeployerOrAdmin && (
                      <button onClick={() => handleDelete(deployment.id)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">PA Version:</span>
                      <span className="text-white font-mono">{deployment.powerAppsVersion}</span>
                    </div>
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-gray-500">Tasks:</span>
                      <button
                        onClick={() => setExpandedId(expandedId === deployment.id ? null : deployment.id)}
                        className="text-white bg-white/5 px-2 py-1 rounded-md text-xs flex items-center gap-1 hover:bg-white/10"
                      >
                        {deployment.taskIds.length} {expandedId === deployment.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {expandedId === deployment.id && (
                    <div className="bg-[#1a1a1a] rounded-xl p-4 mb-4 border border-white/5 text-sm space-y-4">
                      <div>
                        <h5 className="font-semibold mb-2 flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" /> Timeline</h5>
                        <ul className="text-gray-400 space-y-1 text-xs">
                          {deployment.createdAt && <li>Created: {deployment.createdAt.toDate().toLocaleString()}</li>}
                          {deployment.promotedToStageAt && <li>To Stage: {deployment.promotedToStageAt.toDate().toLocaleString()}</li>}
                          {deployment.promotedToProdAt && <li>To Prod: {deployment.promotedToProdAt.toDate().toLocaleString()}</li>}
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-semibold mb-2 text-white">Tasks</h5>
                        {deployment.taskIds.map(taskId => {
                          const task = tasks.find(t => t.id === taskId);
                          return (
                            <div key={taskId} className="text-gray-300 text-xs py-1 border-b border-white/5 last:border-0 pl-1">
                              {task ? `• ${task.title}` : `• Unknown Task (${taskId})`}
                            </div>
                          );
                        })}
                        {deployment.taskIds.length === 0 && <span className="text-gray-500 text-xs">No tasks attached.</span>}
                      </div>
                    </div>
                  )}

                  {deployment.fileUrl && (
                    <a
                      href={deployment.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2 bg-white/5 hover:bg-white/10 text-cyan-400 rounded-lg text-sm font-medium transition-colors mb-4"
                    >
                      <Download className="w-4 h-4" />
                      Download ZIP
                    </a>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t border-white/10 mt-auto">
                    {env === 'dev' && isDeployerOrAdmin && (
                      <button
                        onClick={() => handlePromote(deployment, 'stage')}
                        className="flex items-center gap-2 text-sm text-yellow-500 hover:text-yellow-400 font-medium"
                      >
                        Promote to Stage <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                    {env === 'stage' && isDeployerOrAdmin && (
                      <button
                        onClick={() => handlePromote(deployment, 'prod')}
                        className="flex items-center gap-2 text-sm text-green-500 hover:text-green-400 font-medium"
                      >
                        Promote to Prod <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                    {env === 'prod' && (
                      <span className="text-sm text-green-500/50 font-medium flex items-center gap-1">
                        <CheckSquare className="w-4 h-4" /> Live
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
