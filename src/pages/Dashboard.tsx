import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Project, Task, Deployment } from '../types';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { FolderKanban, CheckSquare, Rocket, Activity } from 'lucide-react';

export const Dashboard = () => {
  const [stats, setStats] = useState({
    projects: 0,
    tasks: 0,
    deployments: 0,
    activeTasks: 0
  });

  useEffect(() => {
    const unsubProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
      setStats(s => ({ ...s, projects: snapshot.size }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'projects'));

    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      let active = 0;
      snapshot.forEach(doc => {
        const data = doc.data() as Task;
        if (data.status !== 'completed') active++;
      });
      setStats(s => ({ ...s, tasks: snapshot.size, activeTasks: active }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'tasks'));

    const unsubDeployments = onSnapshot(collection(db, 'deployments'), (snapshot) => {
      setStats(s => ({ ...s, deployments: snapshot.size }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'deployments'));

    return () => {
      unsubProjects();
      unsubTasks();
      unsubDeployments();
    };
  }, []);

  const statCards = [
    { title: 'Total Projects', value: stats.projects, icon: FolderKanban, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { title: 'Total Tasks', value: stats.tasks, icon: CheckSquare, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { title: 'Active Tasks', value: stats.activeTasks, icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    { title: 'Deployments', value: stats.deployments, icon: Rocket, color: 'text-green-400', bg: 'bg-green-400/10' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-gray-400 mt-1">Overview of your Power Apps developments.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-[#111] border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110`} />
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-sm font-medium text-gray-400">{stat.title}</p>
                <p className="text-4xl font-bold text-white mt-2">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
