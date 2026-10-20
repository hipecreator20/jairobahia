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
import { PromptVersion } from '../../types';

const COLLECTION_NAME = 'promptVersions';

export function subscribePrompts(
  ownerId: string,
  onUpdate: (prompts: PromptVersion[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('ownerId', '==', ownerId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: PromptVersion[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as PromptVersion);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    }
  );
}

export async function savePromptVersion(
  data: Omit<PromptVersion, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<PromptVersion> {
  const promptId = data.id || `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newPrompt: PromptVersion = {
    id: promptId,
    title: data.title.trim().slice(0, 128),
    platform: (data.platform || 'Midjourney').trim().slice(0, 64),
    content: data.content.trim().slice(0, 4000),
    tags: (data.tags || []).slice(0, 20),
    ownerId: data.ownerId,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, COLLECTION_NAME, promptId);
    await setDoc(docRef, newPrompt);
    return newPrompt;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${COLLECTION_NAME}/${promptId}`);
    throw error;
  }
}

export async function deletePromptVersion(promptId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, promptId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${promptId}`);
    throw error;
  }
}

export async function seedInitialPromptsIfEmpty(ownerId: string): Promise<void> {
  try {
    const q = query(collection(db, COLLECTION_NAME), where('ownerId', '==', ownerId));
    const snap = await getDocs(q);
    if (!snap.empty) return;

    const initialPrompts: Array<Omit<PromptVersion, 'id' | 'createdAt' | 'updatedAt'>> = [
      {
        title: 'Influenciadora em Golden Hour (Paris Rooftop)',
        platform: 'Midjourney',
        tags: ['Fashion', 'Golden Hour', '35mm'],
        ownerId,
        content: 'Cinematic medium shot of a chic brunette digital influencer in a tailored copper silk blazer on a Paris rooftop balcony during sunset. Warm golden hour rim lighting on hair, slight wind motion, photorealistic skin texture, natural soft focus, Hasselblad H6D-100c 80mm lens --ar 16:9 --style raw --v 6.1 --stylize 250',
      },
      {
        title: 'Plano Sequência Cyberpunk (Tokyo Night)',
        platform: 'Kling AI / Runway',
        tags: ['Sci-Fi', 'Night', 'Motion'],
        ownerId,
        content: 'Smooth steadicam tracking shot following an athletic digital model walking briskly through rain-slicked Tokyo neon backstreets. Wet asphalt reflection of cyan and magenta signage, shallow depth of field, anamorphic lens flares, 24fps cinema filmic motion, ultra-detailed 8k.',
      },
      {
        title: 'Retrato de Alta Costura Editorial (Vogue Studio)',
        platform: 'Google Flow / Flux.1',
        tags: ['Editorial', 'Studio', 'Portrait'],
        ownerId,
        content: 'Extreme high-fashion editorial portrait of a digital model with radiant golden skin, sharp jawline, minimalist sculptural jewelry, deep charcoal seamless backdrop, single diffuse softbox overhead lighting, micro skin pores visible, 85mm f/1.4 lens.',
      },
    ];

    for (const p of initialPrompts) {
      await savePromptVersion(p);
    }
  } catch (error) {
    console.warn('Could not seed initial prompts:', error);
  }
}
