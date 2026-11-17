import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

/**
 * Legacy read-only Firebase configuration (projectId: principal-day-6n50x).
 * Preserves existing published Think Sessions, Media recordings, and public
 * site channel links while the new project handles Wrapped CMS and new edits.
 */
const legacyFirebaseConfig = {
  projectId: "principal-day-6n50x",
  appId: "1:90210330512:web:5cd10ca407c21d22393515",
  apiKey: "AIzaSyCi1cfnEluu8TblgW-aZDm43wTVUWr29sY",
  authDomain: "principal-day-6n50x.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-friendlyjourney-9fce1a55-d36b-4c9e-8ad2-3ae65a176302",
  storageBucket: "principal-day-6n50x.firebasestorage.app",
  messagingSenderId: "90210330512",
  measurementId: "",
};

const LEGACY_APP_NAME = "legacy-tta";

const existingLegacy = getApps().find((a) => a.name === LEGACY_APP_NAME);
const legacyApp = existingLegacy ?? initializeApp(legacyFirebaseConfig, LEGACY_APP_NAME);

export const legacyDb = getFirestore(legacyApp, legacyFirebaseConfig.firestoreDatabaseId);
