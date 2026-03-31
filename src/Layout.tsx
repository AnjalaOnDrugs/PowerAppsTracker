import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { CheckSquare, Rocket, Users, LogOut, LayoutDashboard, FolderKanban } from 'lucide-react';
import { cn } from './lib/utils';
import { motion } from 'framer-motion';
import { PowerAppsLogo } from './components/PowerAppsLogo';

export const Layout = () => {
  const { profile, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Projects', path: '/projects', icon: FolderKanban },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Deployments', path: '/deployments', icon: Rocket },
    ...((profile?.roles?.includes('admin') || profile?.role === 'admin') ? [{ name: 'Admin', path: '/admin', icon: Users }] : []),
  ];

  return (
    <div className="flex h-screen bg-[#050505] text-gray-300 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-[#0a0a0a] flex flex-col">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500 flex items-center gap-2">
            <PowerAppsLogo className="w-7 h-7 shrink-0 text-pink-400" />
            PowerTracker
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative group",
                  isActive ? "text-white bg-white/5" : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute left-0 w-1 h-8 bg-pink-500 rounded-r-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
                <item.icon className={cn("w-5 h-5", isActive ? "text-pink-400" : "group-hover:text-pink-400")} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl mb-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              {profile?.displayName?.charAt(0) || profile?.email?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile?.displayName || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{(profile?.roles || [profile?.role]).filter(Boolean).join(', ')}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-2 w-full text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-pink-900/10 via-transparent to-transparent" />
        <div className="p-8 relative z-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
