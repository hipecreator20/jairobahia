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
import { auth, db, handleFirestoreError, OperationType } from '../config';
import { Story, Scene } from '../../types';

const STORIES_COLLECTION = 'stories';
const SCENES_COLLECTION = 'scenes';

// ----------------------------------------------------
// Stories Realtime Subscription & Operations
// ----------------------------------------------------
export function subscribeStories(
  ownerId: string,
  onUpdate: (stories: Story[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    collection(db, STORIES_COLLECTION),
    where('ownerId', '==', ownerId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Story[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as Story);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.LIST, STORIES_COLLECTION);
    }
  );
}

export async function createStory(
  data: Omit<Story, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<Story> {
  const storyId = data.id || `story_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newStory: Story = {
    id: storyId,
    title: data.title.trim().slice(0, 128),
    synopsis: (data.synopsis || '').trim().slice(0, 2000),
    characterIds: data.characterIds || [],
    sceneCount: typeof data.sceneCount === 'number' ? data.sceneCount : 0,
    status: data.status || 'draft',
    ownerId: data.ownerId,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, STORIES_COLLECTION, storyId);
    await setDoc(docRef, newStory);
    return newStory;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${STORIES_COLLECTION}/${storyId}`);
    throw error;
  }
}

export async function updateStory(
  storyId: string,
  data: Partial<Omit<Story, 'id' | 'ownerId' | 'createdAt'>> & { ownerId: string }
): Promise<void> {
  const now = new Date().toISOString();
  const docRef = doc(db, STORIES_COLLECTION, storyId);

  const payload: any = {
    ...data,
    updatedAt: now,
  };
  if (payload.title) payload.title = payload.title.trim().slice(0, 128);
  if (payload.synopsis) payload.synopsis = payload.synopsis.trim().slice(0, 2000);

  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${STORIES_COLLECTION}/${storyId}`);
    throw error;
  }
}

export async function deleteStory(storyId: string): Promise<void> {
  try {
    const docRef = doc(db, STORIES_COLLECTION, storyId);
    // Keep the story recoverable if scene cleanup fails; scope the query to its owner.
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Sessão necessária para excluir a história.');
    const q = query(collection(db, SCENES_COLLECTION), where('ownerId', '==', uid), where('storyId', '==', storyId));
    const scenesSnap = await getDocs(q);
    const deletePromises = scenesSnap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${STORIES_COLLECTION}/${storyId}`);
    throw error;
  }
}

// ----------------------------------------------------
// Scenes Realtime Subscription & Operations
// ----------------------------------------------------
export function subscribeScenes(
  storyId: string,
  ownerId: string,
  onUpdate: (scenes: Scene[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    collection(db, SCENES_COLLECTION),
    where('ownerId', '==', ownerId),
    where('storyId', '==', storyId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Scene[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as Scene);
      });
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      onUpdate(list);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.LIST, SCENES_COLLECTION);
    }
  );
}

export async function createScene(
  data: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<Scene> {
  const sceneId = data.id || `scene_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newScene: Scene = {
    id: sceneId,
    storyId: data.storyId,
    title: data.title.trim().slice(0, 128),
    prompt: (data.prompt || '').trim().slice(0, 2000),
    visualStyle: (data.visualStyle || '').trim().slice(0, 128),
    status: data.status || 'ready',
    ownerId: data.ownerId,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, SCENES_COLLECTION, sceneId);
    await setDoc(docRef, newScene);
    return newScene;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${SCENES_COLLECTION}/${sceneId}`);
    throw error;
  }
}

export async function updateScene(
  sceneId: string,
  data: Partial<Omit<Scene, 'id' | 'storyId' | 'ownerId' | 'createdAt'>> & { ownerId: string }
): Promise<void> {
  const now = new Date().toISOString();
  const docRef = doc(db, SCENES_COLLECTION, sceneId);

  const payload: any = {
    ...data,
    updatedAt: now,
  };
  if (payload.title) payload.title = payload.title.trim().slice(0, 128);
  if (payload.prompt) payload.prompt = payload.prompt.trim().slice(0, 2000);
  if (payload.visualStyle) payload.visualStyle = payload.visualStyle.trim().slice(0, 128);

  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${SCENES_COLLECTION}/${sceneId}`);
    throw error;
  }
}

export async function deleteScene(sceneId: string): Promise<void> {
  try {
    const docRef = doc(db, SCENES_COLLECTION, sceneId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${SCENES_COLLECTION}/${sceneId}`);
    throw error;
  }
}

export async function duplicateScene(
  sourceScene: Scene,
  ownerId: string
): Promise<Scene> {
  const sceneId = `scene_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const duplicatedScene: Scene = {
    id: sceneId,
    storyId: sourceScene.storyId,
    title: `${sourceScene.title.slice(0, 115)} (Cópia)`.slice(0, 128),
    prompt: sourceScene.prompt || '',
    visualStyle: sourceScene.visualStyle || '',
    status: sourceScene.status || 'ready',
    ownerId,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, SCENES_COLLECTION, sceneId);
    await setDoc(docRef, duplicatedScene);
    return duplicatedScene;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${SCENES_COLLECTION}/${sceneId}`);
    throw error;
  }
}

export async function reorderScenes(
  orderedScenes: Scene[],
  ownerId: string
): Promise<void> {
  const baseTime = Date.now() - orderedScenes.length * 2000;
  for (let i = 0; i < orderedScenes.length; i++) {
    const scene = orderedScenes[i];
    const newTimestamp = new Date(baseTime + i * 1000).toISOString();
    const docRef = doc(db, SCENES_COLLECTION, scene.id);
    try {
      await setDoc(
        docRef,
        {
          createdAt: newTimestamp,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${SCENES_COLLECTION}/${scene.id}`);
    }
  }
}

// ----------------------------------------------------
// Duration parsing and formatting helper utilities
// ----------------------------------------------------
export function parseSceneDuration(visualStyle?: string): number {
  if (!visualStyle) return 5;
  const match = visualStyle.match(/\[(\d+)s\]/);
  if (match) return parseInt(match[1], 10);
  const match2 = visualStyle.match(/(\d+)s/);
  if (match2) return parseInt(match2[1], 10);
  return 5;
}

export function formatVisualStyleWithDuration(
  baseStyle: string,
  durationSec: number
): string {
  const clean = (baseStyle || 'Cinematográfico')
    .replace(/\s*\[\d+s\]|\s*·\s*\d+s/g, '')
    .trim();
  const capped = clean.slice(0, 115);
  return `${capped} [${durationSec}s]`;
}

