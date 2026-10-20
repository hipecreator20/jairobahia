export type ProjectStatus = 'active' | 'archived' | 'completed';

export interface Project {
  id: string;
  title: string;
  description?: string;
  sceneCount?: number;
  thumbnail?: string;
  status: ProjectStatus;
  tags?: string[];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Character {
  id: string;
  name: string;
  niche?: string;
  bio?: string;
  visualDna?: string;
  avatarUrl?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Story {
  id: string;
  title: string;
  synopsis?: string;
  characterIds?: string[];
  sceneCount?: number;
  status: 'draft' | 'in_progress' | 'completed';
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Scene {
  id: string;
  storyId: string;
  title: string;
  prompt?: string;
  visualStyle?: string;
  status: 'draft' | 'ready' | 'rendered';
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImageAsset {
  id: string;
  title?: string;
  projectId?: string;
  characterId?: string;
  prompt?: string;
  imageUrl: string;
  storagePath?: string;
  aspect?: string;
  modelUsed?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromptVersion {
  id: string;
  title: string;
  platform?: string;
  content: string;
  tags?: string[];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  theme: 'dark' | 'light';
  language: string;
  defaultAspect: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  isOwner: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  plan: 'free' | 'pro' | 'premium';
  preferences?: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface StudioStats {
  projectsCount: number;
  scenesCount: number;
  imagesCount: number;
  charactersCount: number;
  storageUsedBytes: number;
  storageQuotaBytes: number;
}

export interface GeminiStatusInfo {
  configured: boolean;
  verified: boolean;
  model: string;
  message: string;
  sampleEcho?: string;
  latencyMs?: number;
  timestamp?: string;
  errorDetails?: string;
}
