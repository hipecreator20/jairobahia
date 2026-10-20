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
import { Character } from '../../types';

const COLLECTION_NAME = 'characters';

export function subscribeCharacters(
  ownerId: string,
  onUpdate: (characters: Character[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('ownerId', '==', ownerId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Character[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as Character);
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

export async function createCharacter(
  data: Omit<Character, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<Character> {
  const characterId = data.id || `char_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newCharacter: Character = {
    id: characterId,
    name: data.name.trim(),
    niche: data.niche?.trim() || 'Criador Digital',
    bio: data.bio?.trim() || '',
    visualDna: data.visualDna?.trim() || 'Estética realista, traços harmônicos, consistência facial 4K.',
    avatarUrl: data.avatarUrl || '',
    ownerId: data.ownerId,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, COLLECTION_NAME, characterId);
    await setDoc(docRef, newCharacter);
    return newCharacter;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${COLLECTION_NAME}/${characterId}`);
  }
}

export async function updateCharacter(
  characterId: string,
  updates: Partial<Omit<Character, 'id' | 'ownerId' | 'createdAt'>>,
  existingCharacter: Character
): Promise<Character> {
  const updated: Character = {
    ...existingCharacter,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  try {
    const docRef = doc(db, COLLECTION_NAME, characterId);
    await setDoc(docRef, updated);
    return updated;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${characterId}`);
  }
}

export async function deleteCharacter(characterId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, characterId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${characterId}`);
  }
}

export async function seedInitialCharactersIfEmpty(ownerId: string): Promise<void> {
  try {
    const q = query(collection(db, COLLECTION_NAME), where('ownerId', '==', ownerId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return;

    const seedData: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Lara',
        niche: 'Modelo',
        bio: 'Top model digital internacional com foco em moda sustentável e alta costura.',
        visualDna: 'Olhos castanhos quentes, pele dourada radiante, cabelos castanhos volumosos ondulados.',
        avatarUrl: '/assets/images/avatar_lara_model_1792450194066.jpg',
        ownerId,
      },
      {
        name: 'Camila',
        niche: 'Fitness',
        bio: 'Personal trainer virtual e defensora de saúde integrativa e longevidade.',
        visualDna: 'Cabelos loiros iluminados, sorriso radiante, postura atlética, iluminação natural.',
        avatarUrl: '/assets/images/avatar_camila_fitness_1792450194470.jpg',
        ownerId,
      },
      {
        name: 'Bruno',
        niche: 'Lifestyle',
        bio: 'Criador de conteúdo sobre viagens cinematográficas, café especial e arquitetura.',
        visualDna: 'Barba alinhada, óculos escuros clássicos, iluminação de golden hour.',
        avatarUrl: '/assets/images/hero_virtual_model_1792450194472.jpg',
        ownerId,
      },
      {
        name: 'Julia',
        niche: 'Fashion',
        bio: 'Diretora criativa e influenciadora de tendências de streetwear e luxo moderno.',
        visualDna: 'Estética minimalista sofisticada, maquiagem natural, contrastes sutis.',
        avatarUrl: '/assets/images/project_beach_day_1792450194606.jpg',
        ownerId,
      },
    ];

    for (const item of seedData) {
      await createCharacter(item);
    }
  } catch (err) {
    console.warn('Initial character seed skipped or handled:', err);
  }
}
