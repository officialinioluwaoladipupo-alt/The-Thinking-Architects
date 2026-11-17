"use client";

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  auth,
  captureFirestoreError,
  db,
  formatFirestoreErrorMessage,
  OperationType,
  testConnection,
} from "../lib/firebase";

const BOOTSTRAPPED_ADMIN_EMAIL = "officialinioluwaoladipupo@gmail.com";

type FirebaseContextValue = {
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  checkingAdmin: boolean;
  authError: string;
  connectionOffline: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const FirebaseContext = createContext<FirebaseContextValue>({
  user: null,
  authReady: false,
  isAdmin: false,
  checkingAdmin: false,
  authError: "",
  connectionOffline: false,
  signInWithGoogle: async () => {},
  signOutUser: async () => {},
});

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [authError, setAuthError] = useState("");
  const [connectionOffline, setConnectionOffline] = useState(false);

  useEffect(() => {
    let active = true;
    void testConnection().then((res) => {
      if (active && res.offline) {
        setConnectionOffline(true);
      }
    });

    const unsubscribe = onAuthStateChanged(
      auth,
      async (nextUser) => {
        if (!active) return;
        setUser(nextUser);
        setAuthError("");

        if (!nextUser) {
          setIsAdmin(false);
          setCheckingAdmin(false);
          setAuthReady(true);
          return;
        }

        if (!nextUser.emailVerified) {
          setIsAdmin(false);
          setCheckingAdmin(false);
          setAuthReady(true);
          return;
        }

        if (nextUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL) {
          setIsAdmin(true);
          setCheckingAdmin(false);
          setAuthReady(true);
          return;
        }

        setCheckingAdmin(true);
        try {
          const adminDoc = await getDoc(doc(db, "admins", nextUser.uid));
          if (active) {
            setIsAdmin(adminDoc.exists());
          }
        } catch (err) {
          // Non-admins receive permission-denied when checking /admins/{uid}; treat as non-admin cleanly
          const msg = err instanceof Error ? err.message : String(err);
          if (!msg.toLowerCase().includes("permission") && !msg.toLowerCase().includes("insufficient")) {
            const structured = captureFirestoreError(err, OperationType.GET, `admins/${nextUser.uid}`);
            if (active) {
              setAuthError(formatFirestoreErrorMessage(structured));
            }
          }
          if (active) {
            setIsAdmin(false);
          }
        } finally {
          if (active) {
            setCheckingAdmin(false);
            setAuthReady(true);
          }
        }
      },
      (err) => {
        if (active) {
          setAuthError(err instanceof Error ? err.message : "Authentication listener failed.");
          setAuthReady(true);
        }
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    setAuthError("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not complete Google sign-in.";
      setAuthError(msg);
    }
  };

  const signOutUser = async () => {
    setAuthError("");
    try {
      await signOut(auth);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Could not sign out cleanly.");
    }
  };

  return (
    <FirebaseContext.Provider
      value={{
        user,
        authReady,
        isAdmin,
        checkingAdmin,
        authError,
        connectionOffline,
        signInWithGoogle,
        signOutUser,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  return useContext(FirebaseContext);
}
