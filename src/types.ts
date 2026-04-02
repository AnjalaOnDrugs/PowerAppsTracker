import { Timestamp } from 'firebase/firestore';

export type Role = 'admin' | 'project_manager' | 'developer' | 'deployer';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role?: Role; // legacy
  roles?: Role[];
  createdAt?: Timestamp;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  screens?: string[];
  createdAt?: Timestamp;
  createdBy: string;
}

export type TaskStatus = 'backlog' | 'todo' | 'in-progress' | 'completed' | 'testing';

export interface TaskComment {
  id: string;
  text: string;
  createdBy: string;
  createdAt: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  assigneeId?: string; // Legacy support
  assigneeIds?: string[];
  status: TaskStatus;
  percentage?: number;
  screen?: string;
  comments?: TaskComment[];
  createdAt?: Timestamp;
  createdBy: string;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
}

export type Environment = 'dev' | 'stage' | 'prod';

export interface Deployment {
  id: string;
  projectId: string;
  version: string;
  powerAppsVersion: string;
  environment: Environment;
  taskIds: string[];
  fileUrl?: string;
  fileName?: string;
  createdAt?: Timestamp;
  createdBy: string;
  promotedToStageAt?: Timestamp;
  promotedToProdAt?: Timestamp;
}
