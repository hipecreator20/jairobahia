import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../config';
import { Project } from '../../types';

const COLLECTION_NAME = 'projects';

export function subscribeProjects(
  ownerId: string,
  onUpdate: (projects: Project[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('ownerId', '==', ownerId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Project[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as Project);
      });
      // Sort client-side by createdAt descending
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    }
  );
}

export async function createProject(
  data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<Project> {
  const projectId = data.id || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newProject: Project = {
    id: projectId,
    title: data.title.trim(),
    description: data.description?.trim() || '',
    sceneCount: data.sceneCount ?? 1,
    thumbnail: data.thumbnail || '',
    status: data.status || 'active',
    tags: data.tags || ['IA', 'Cinema'],
    ownerId: data.ownerId,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, COLLECTION_NAME, projectId);
    await setDoc(docRef, newProject);
    return newProject;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${COLLECTION_NAME}/${projectId}`);
  }
}

export async function updateProject(
  projectId: string,
  updates: Partial<Omit<Project, 'id' | 'ownerId' | 'createdAt'>>,
  existingProject: Project
): Promise<Project> {
  const updatedProject: Project = {
    ...existingProject,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  try {
    const docRef = doc(db, COLLECTION_NAME, projectId);
    await setDoc(docRef, updatedProject);
    return updatedProject;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${projectId}`);
  }
}

export async function deleteProject(projectId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, projectId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${projectId}`);
  }
}

export async function seedInitialProjectsIfEmpty(ownerId: string): Promise<void> {
  try {
    const q = query(collection(db, COLLECTION_NAME), where('ownerId', '==', ownerId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return;

    // Seed starter projects matching the user's reference UI
    const seedData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        title: 'Dia na Praia',
        description: 'Produção cinematográfica no litoral com iluminação de pôr do sol e estética editorial.',
        sceneCount: 8,
        thumbnail: '/assets/images/project_beach_day_1792450194606.jpg',
        status: 'active',
        tags: ['Praia', 'Verão', 'Cinematográfico'],
        ownerId,
      },
      {
        title: 'Noite na Cidade',
        description: 'Exploração noturna urbana com iluminação neon, reflexos de asfalto molhado e visual cyberpunk.',
        sceneCount: 6,
        thumbnail: '/assets/images/project_city_night_1792450194169.jpg',
        status: 'active',
        tags: ['Urbano', 'Nightlife', 'Neon'],
        ownerId,
      },
      {
        title: 'Campanha Verão',
        description: 'Sessão de fotos e vídeos promocionais para marca de moda praia com influenciadora digital.',
        sceneCount: 10,
        thumbnail: '/assets/images/hero_virtual_model_1792450194472.jpg',
        status: 'active',
        tags: ['Moda', 'Fashion', 'Verão'],
        ownerId,
      },
      {
        title: 'Lifestyle',
        description: 'Conteúdo dinâmico para redes sociais com rotina, elegância e cenários arquitetônicos.',
        sceneCount: 5,
        thumbnail: '/assets/images/avatar_camila_fitness_1792450194470.jpg',
        status: 'active',
        tags: ['Lifestyle', 'Reels', 'Influencer'],
        ownerId,
      },
    ];

    for (const item of seedData) {
      await createProject(item);
    }
  } catch (err) {
    console.warn('Initial project seed skipped or handled:', err);
  }
}
