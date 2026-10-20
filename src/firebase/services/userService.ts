import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../config';
import { UserProfile, UserPreferences } from '../../types';

const COLLECTION_NAME = 'users';

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${COLLECTION_NAME}/${userId}`);
  }
}

export async function syncUserProfile(
  userId: string,
  email: string,
  displayName?: string,
  photoURL?: string,
  isOwner = true
): Promise<UserProfile> {
  const now = new Date().toISOString();
  const docRef = doc(db, COLLECTION_NAME, userId);

  try {
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      const data = existing.data() as UserProfile;
      const updated: UserProfile = {
        ...data,
        displayName: displayName || data.displayName,
        photoURL: photoURL || data.photoURL,
        updatedAt: now,
      };
      await setDoc(docRef, updated, { merge: true });
      return updated;
    }

    const newProfile: UserProfile = {
      id: userId,
      email,
      displayName: displayName || 'Proprietário do Estúdio',
      photoURL: photoURL || '',
      isOwner,
      preferences: {
        theme: 'dark',
        language: 'pt-BR',
        defaultAspect: '16:9',
      },
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(docRef, newProfile);
    return newProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTION_NAME}/${userId}`);
  }
}

export async function updateUserPreferences(
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const current = snap.data() as UserProfile;
      const updated: UserProfile = {
        ...current,
        preferences: {
          ...current.preferences,
          ...preferences,
          theme: preferences.theme || current.preferences?.theme || 'dark',
          language: preferences.language || current.preferences?.language || 'pt-BR',
          defaultAspect: preferences.defaultAspect || current.preferences?.defaultAspect || '16:9',
        },
        updatedAt: new Date().toISOString(),
      };
      await setDoc(docRef, updated, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${userId}`);
  }
}
