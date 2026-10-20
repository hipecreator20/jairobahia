import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  UserCredential,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import { syncUserProfile } from '../firebase/services/userService';
import { UserProfile } from '../types';

export const AUTHORIZED_OWNER_EMAIL = 'indicabrasiloficiall@gmail.com';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isOwner: boolean;
  isAuthorized: boolean;
  loading: boolean;
  unauthorizedEmail: string | null;
  authError: string | null;
  signInWithGoogle: () => Promise<UserCredential>;
  logout: () => Promise<void>;
  dismissUnauthorizedNotice: () => void;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorizedEmail, setUnauthorizedEmail] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Listen to Firebase auth state changes persistently
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email || '';
        const isAuthorizedOwner = email.trim().toLowerCase() === AUTHORIZED_OWNER_EMAIL.trim().toLowerCase();

        if (!isAuthorizedOwner) {
          console.warn(`[HYPE AUTH] Acesso bloqueado para e-mail não autorizado: ${email}`);
          setUnauthorizedEmail(email);
          setUser(null);
          setProfile(null);
          try {
            await fbSignOut(auth);
          } catch (e) {
            console.error('[HYPE AUTH] Erro ao deslogar usuário não autorizado:', e);
          }
        } else {
          console.log(`[HYPE AUTH] Proprietário autorizado autenticado: ${email} (UID: ${firebaseUser.uid})`);
          setUnauthorizedEmail(null);
          setUser(firebaseUser);

          // Sync profile in Firestore
          try {
            const synced = await syncUserProfile(
              firebaseUser.uid,
              email,
              firebaseUser.displayName || 'Proprietário Hype',
              firebaseUser.photoURL || '',
              true
            );
            setProfile(synced);
          } catch (e) {
            console.warn('[HYPE AUTH] Perfil Firestore sincronizado em memória de fallback:', e);
            setProfile({
              id: firebaseUser.uid,
              email,
              displayName: firebaseUser.displayName || 'Proprietário Hype',
              photoURL: firebaseUser.photoURL || '',
              isOwner: true,
              preferences: {
                theme: 'dark',
                language: 'pt-BR',
                defaultAspect: '16:9',
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<UserCredential> => {
    setLoading(true);
    setUnauthorizedEmail(null);
    setAuthError(null);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user?.email || '';
      const isAuthorizedOwner = email.trim().toLowerCase() === AUTHORIZED_OWNER_EMAIL.trim().toLowerCase();

      if (!isAuthorizedOwner) {
        console.warn(`[HYPE AUTH] Popup concluído com e-mail não autorizado: ${email}`);
        setUnauthorizedEmail(email);
        await fbSignOut(auth);
        setUser(null);
        setProfile(null);
        setLoading(false);
        throw new Error(`Acesso não autorizado: O e-mail ${email} não é o proprietário do estúdio.`);
      }

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
      setUnauthorizedEmail(null);
      setAuthError(null);
      setLoading(false);
    }
  };

  const dismissUnauthorizedNotice = () => {
    setUnauthorizedEmail(null);
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  const isOwner = Boolean(
    user?.email && user.email.trim().toLowerCase() === AUTHORIZED_OWNER_EMAIL.trim().toLowerCase()
  );
  const isAuthorized = Boolean(user && isOwner);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isOwner,
        isAuthorized,
        loading,
        unauthorizedEmail,
        authError,
        signInWithGoogle,
        logout,
        dismissUnauthorizedNotice,
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
