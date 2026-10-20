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
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../config';
import { ImageAsset } from '../../types';

const COLLECTION_NAME = 'imageAssets';

export function subscribeImageAssets(
  ownerId: string,
  onUpdate: (images: ImageAsset[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('ownerId', '==', ownerId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ImageAsset[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as ImageAsset);
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

export async function saveImageAsset(params: {
  id?: string;
  title?: string;
  projectId?: string;
  characterId?: string;
  prompt: string;
  aspect?: string;
  modelUsed?: string;
  ownerId: string;
  imageBase64: string; // data URL or base64
}): Promise<ImageAsset> {
  const assetId = params.id || `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  let finalImageUrl = params.imageBase64;
  let storagePath: string | undefined = undefined;

  // 1. Attempt upload to Firebase Storage
  if (params.imageBase64.startsWith('data:')) {
    try {
      const path = `users/${params.ownerId}/images/${assetId}.png`;
      const storageRef = ref(storage, path);
      await uploadString(storageRef, params.imageBase64, 'data_url');
      finalImageUrl = await getDownloadURL(storageRef);
      storagePath = path;
    } catch (storageError) {
      console.error('[HYPE STORAGE] Upload não concluído:', storageError);
      throw new Error('Não foi possível salvar a imagem no Firebase Storage. Verifique as regras e tente novamente.');
    }
  }

  // 2. Persist metadata in Firestore
  const newAsset: ImageAsset = {
    id: assetId,
    title: params.title?.trim() || 'Criação do Estúdio',
    prompt: params.prompt.trim(),
    imageUrl: finalImageUrl,
    storagePath: storagePath || '',
    aspect: params.aspect || '1:1',
    modelUsed: params.modelUsed || 'gemini-3.1-flash-lite-image',
    ownerId: params.ownerId,
    createdAt: now,
    updatedAt: now,
  };

  if (params.projectId) newAsset.projectId = params.projectId;
  if (params.characterId) newAsset.characterId = params.characterId;

  try {
    const docRef = doc(db, COLLECTION_NAME, assetId);
    await setDoc(docRef, newAsset);
    return newAsset;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${COLLECTION_NAME}/${assetId}`);
  }
}

export async function deleteImageAsset(assetId: string, storagePath?: string): Promise<void> {
  // Try to remove from Storage if path exists
  if (storagePath) {
    try {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
    } catch (storageErr) {
      // Preserve the gallery entry for retry when Storage denies or fails deletion.
      if ((storageErr as { code?: string }).code !== 'storage/object-not-found') throw storageErr;
    }
  }

  // Delete from Firestore
  try {
    const docRef = doc(db, COLLECTION_NAME, assetId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${assetId}`);
  }
}

export async function seedInitialImageAssetsIfEmpty(ownerId: string): Promise<void> {
  try {
    const q = query(collection(db, COLLECTION_NAME), where('ownerId', '==', ownerId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return;

    const seedData: Omit<ImageAsset, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        title: 'Dia na Praia (Cena 1)',
        prompt: 'Fotografia cinematográfica de enseada de praia tropical com água azul-turquesa, areia dourada e iluminação de pôr do sol.',
        imageUrl: '/assets/images/project_beach_day_1792450194606.jpg',
        aspect: '4:3',
        modelUsed: 'gemini-3.1-flash-lite-image',
        ownerId,
      },
      {
        title: 'Noite na Cidade (Cena 2)',
        prompt: 'Fotografia noturna de metrópole moderna com iluminação neon, asfalto molhado e atmosfera cinematográfica.',
        imageUrl: '/assets/images/project_city_night_1792450194169.jpg',
        aspect: '4:3',
        modelUsed: 'gemini-3.1-flash-lite-image',
        ownerId,
      },
      {
        title: 'Campanha Editorial',
        prompt: 'Mulher influenciadora digital com pele radiante, terno de seda em terra cota, sacada com vista ao entardecer.',
        imageUrl: '/assets/images/hero_virtual_model_1792450194472.jpg',
        aspect: '16:9',
        modelUsed: 'gemini-3.1-flash-lite-image',
        ownerId,
      },
      {
        title: 'Lara Beauty Portrait',
        prompt: 'Retrato de beleza editorial de modelo digital com olhos castanhos expressivos e maquiagem radiante natural.',
        imageUrl: '/assets/images/avatar_lara_model_1792450194066.jpg',
        aspect: '1:1',
        modelUsed: 'gemini-3.1-flash-lite-image',
        ownerId,
      },
      {
        title: 'Camila Activewear',
        prompt: 'Retrato de influenciadora fitness com sorriso radiante em iluminação solar suave e ambiente de estúdio.',
        imageUrl: '/assets/images/avatar_camila_fitness_1792450194470.jpg',
        aspect: '1:1',
        modelUsed: 'gemini-3.1-flash-lite-image',
        ownerId,
      },
    ];

    const now = new Date().toISOString();
    for (const item of seedData) {
      const assetId = `img_seed_${Math.random().toString(36).substring(2, 9)}`;
      const docRef = doc(db, COLLECTION_NAME, assetId);
      await setDoc(docRef, {
        id: assetId,
        ...item,
        createdAt: now,
        updatedAt: now,
      });
    }
  } catch (err) {
    console.warn('[HYPE STORAGE] Seed inicial de imagens tratado:', err);
  }
}
