import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';
import { useAuth } from '../AuthContext';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { Users, Shield, ShieldAlert, Trash2, ClipboardList, Send } from 'lucide-react';

export const Admin = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const us: User[] = [];
      snapshot.forEach(doc => us.push({ uid: doc.id, ...doc.data() } as User));
      setUsers(us);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    return () => unsubUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRoles: User['role'][]) => {
    if (!profile || !(profile.roles?.includes('admin') || profile.role === 'admin')) return;

    // Safety check: prevent admin from inadvertently removing their own admin role
    if (userId === profile.uid && !newRoles.includes('admin')) {
      newRoles.push('admin');
    }

    try {
      await updateDoc(doc(db, 'users', userId), { roles: newRoles });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!profile || !(profile.roles?.includes('admin') || profile.role === 'admin')) return;
    if (userId === profile.uid) {
      console.error("You cannot delete yourself.");
      return;
    }
    // TODO: Implement custom modal confirmation
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Admin Portal</h1>
        <p className="text-gray-400 mt-1">Manage users and system settings.</p>
      </div>

      <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-400" />
            User Management
          </h2>
          <span className="bg-white/10 text-gray-300 px-3 py-1 rounded-full text-sm font-medium">
            {users.length} Users
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/50 border-b border-white/10">
                <th className="p-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">User</th>
                <th className="p-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                <th className="p-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                <th className="p-4 text-sm font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {users.map(user => (
                <tr key={user.uid} className="hover:bg-white/5 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-medium">{user.displayName || 'Unnamed User'}</p>
                        <p className="text-xs text-gray-500">ID: {user.uid.substring(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-300">{user.email}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {(user.roles || (user.role ? [user.role] : ['developer'])).map(role => {
                        if (role === 'admin') return <span key="admin" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 text-xs font-medium border border-purple-500/20"><ShieldAlert className="w-3 h-3" /> Admin</span>;
                        if (role === 'project_manager') return <span key="pm" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/20"><ClipboardList className="w-3 h-3" /> Manager</span>;
                        if (role === 'deployer') return <span key="dep" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-orange-500/10 text-orange-400 text-xs font-medium border border-orange-500/20"><Send className="w-3 h-3" /> Deployer</span>;
                        return <span key="dev" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 text-xs font-medium border border-cyan-500/20"><Shield className="w-3 h-3" /> Developer</span>;
                      })}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <select
                        multiple
                        className="bg-black border border-white/10 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-cyan-500 h-24 w-36 custom-scrollbar"
                        value={user.roles || (user.role ? [user.role] : ['developer'])}
                        onChange={e => {
                          const selected = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value as User['role']);
                          if (selected.length === 0) selected.push('developer');
                          handleRoleChange(user.uid, selected);
                        }}
                      >
                        <option value="developer">Developer</option>
                        <option value="project_manager">Project Manager</option>
                        <option value="deployer">Deployer</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={() => handleDeleteUser(user.uid)}
                        disabled={user.uid === profile?.uid}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
