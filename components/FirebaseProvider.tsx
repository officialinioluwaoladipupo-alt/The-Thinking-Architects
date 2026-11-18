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

const BOOTSTRAPPED_ADMIN_EMAILS = new Set([
  "oladipupoinioluwa93@gmail.com",
  "officialinioluwaoladipupo@gmail.com",
]);

export const GOOGLE_SHEETS_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets.readonly",
] as const;

// Cache OAuth access token strictly in memory (never in localStorage/sessionStorage)
let cachedSheetsAccessToken: string | null = null;

type FirebaseContextValue = {
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  checkingAdmin: boolean;
  authError: string;
  connectionOffline: boolean;
  sheetsToken: string | null;
  connectingSheets: boolean;
  sheetsAuthError: string;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  connectGoogleSheets: () => Promise<string | null>;
  clearSheetsToken: () => void;
};

const FirebaseContext = createContext<FirebaseContextValue>({
  user: null,
  authReady: false,
  isAdmin: false,
  checkingAdmin: false,
  authError: "",
  connectionOffline: false,
  sheetsToken: null,
  connectingSheets: false,
  sheetsAuthError: "",
  signInWithGoogle: async () => {},
  signOutUser: async () => {},
  connectGoogleSheets: async () => null,
  clearSheetsToken: () => {},
});

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [authError, setAuthError] = useState("");
  const [connectionOffline, setConnectionOffline] = useState(false);
  const [sheetsToken, setSheetsToken] = useState<string | null>(null);
  const [connectingSheets, setConnectingSheets] = useState(false);
  const [sheetsAuthError, setSheetsAuthError] = useState("");

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
          cachedSheetsAccessToken = null;
          setSheetsToken(null);
          setSheetsAuthError("");
          setIsAdmin(false);
          setCheckingAdmin(false);
          setAuthReady(true);
          return;
        }

        if (!nextUser.emailVerified) {
          cachedSheetsAccessToken = null;
          setSheetsToken(null);
          setIsAdmin(false);
          setCheckingAdmin(false);
          setAuthReady(true);
          return;
        }

        if (nextUser.email && BOOTSTRAPPED_ADMIN_EMAILS.has(nextUser.email.toLowerCase())) {
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

  const connectGoogleSheets = async (): Promise<string | null> => {
    setSheetsAuthError("");
    setConnectingSheets(true);
    try {
      const provider = new GoogleAuthProvider();
      for (const scope of GOOGLE_SHEETS_SCOPES) {
        provider.addScope(scope);
      }
      provider.setCustomParameters({ prompt: "consent select_account" });
      if (auth.currentUser?.email) {
        provider.setCustomParameters({
          prompt: "consent",
          login_hint: auth.currentUser.email,
        });
      }
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken ?? null;
      if (!accessToken) {
        throw new Error("Could not obtain read access to Google Sheets. Please try again.");
      }
      cachedSheetsAccessToken = accessToken;
      setSheetsToken(accessToken);
      return accessToken;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not connect your Google Sheets account.";
      setSheetsAuthError(msg);
      return null;
    } finally {
      setConnectingSheets(false);
    }
  };

  const clearSheetsToken = () => {
    cachedSheetsAccessToken = null;
    setSheetsToken(null);
    setSheetsAuthError("");
  };

  const signOutUser = async () => {
    setAuthError("");
    setSheetsAuthError("");
    cachedSheetsAccessToken = null;
    setSheetsToken(null);
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
        sheetsToken: sheetsToken ?? cachedSheetsAccessToken,
        connectingSheets,
        sheetsAuthError,
        signInWithGoogle,
        signOutUser,
        connectGoogleSheets,
        clearSheetsToken,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  return useContext(FirebaseContext);
}
