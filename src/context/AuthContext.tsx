import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  UserCredential,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, db, googleProvider } from '../firebase/config';
import { addDoc, collection, doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';

export const AUTHORIZED_OWNER_EMAIL = 'indicabrasiloficiall@gmail.com';
export const MASTER_UID = 'FTqparyG04fCf9eDgUTa6e2tWgp2';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isOwner: boolean;
  isAuthorized: boolean;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<UserCredential>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribeProfile?.();
      setUser(firebaseUser);
      setProfile(null);
      if (!firebaseUser) { setLoading(false); return; }
      const userRef = doc(db, 'users', firebaseUser.uid);
      try {
        const current = await getDoc(userRef);
        if (!current.exists()) {
          const now = new Date().toISOString();
          await setDoc(userRef, {
            id: firebaseUser.uid, email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '', photoURL: firebaseUser.photoURL || '',
            isOwner: firebaseUser.uid === MASTER_UID,
            status: firebaseUser.uid === MASTER_UID ? 'approved' : 'pending', plan: 'free',
            createdAt: now, updatedAt: now,
            preferences: { theme: 'dark', language: 'pt-BR', defaultAspect: '16:9' },
          });
        } else {
          await updateDoc(userRef, {
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || '', updatedAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.warn('[HYPE AUTH] Cadastro inicial aguardando regras atualizadas:', error);
      }
      let loggedLogin = false;
      let previousStatus: UserProfile['status'] | undefined;
      unsubscribeProfile = onSnapshot(userRef, (snapshot) => {
        const data = snapshot.exists() ? snapshot.data() as UserProfile : null;
        if (data?.status === 'approved' && previousStatus !== 'approved') {
          void firebaseUser.getIdToken(true).catch(() => {
            if (auth.currentUser === firebaseUser) setAuthError('Entre novamente para atualizar as permissões da sua sessão.');
          });
        }
        previousStatus = data?.status;
        setProfile(data ? { ...data, isOwner: firebaseUser.uid === MASTER_UID } : null);
        if (data && !loggedLogin) void addDoc(collection(db, 'accessLogs'), {
          uid: firebaseUser.uid, email: firebaseUser.email || '', event: 'login', createdAt: new Date().toISOString(),
        }).catch(error => console.warn('[HYPE AUTH] Evento de acesso não registrado:', error));
        loggedLogin = true;
        setLoading(false);
      }, (error) => {
        console.error('[HYPE AUTH] Falha ao observar status de acesso:', error);
        setLoading(false);
      });
    });
    return () => { unsubscribeProfile?.(); unsubscribeAuth(); };
  }, []);

  const signInWithGoogle = async (): Promise<UserCredential> => {
    setLoading(true);
    setAuthError(null);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      setLoading(false);
      return result;
    } catch (err: any) {
      setLoading(false);
      setAuthError(err?.message || 'Falha ao autenticar com o Google.');
      throw err;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.error('[HYPE AUTH] Erro ao deslogar:', e);
    } finally {
      setUser(null);
      setProfile(null);
      setAuthError(null);
      setLoading(false);
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  const isOwner = user?.uid === MASTER_UID;
  const isAuthorized = Boolean(user && (isOwner || profile?.status === 'approved'));

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isOwner,
        isAuthorized,
        loading,
        authError,
        signInWithGoogle,
        logout,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
