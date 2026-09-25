import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { AppState } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with configured firestoreDatabaseId (CRITICAL: Required by AI Studio)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Export configuration metadata
export const provisionedFirebaseConfig = firebaseConfig;

// Validate Connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

/**
 * Validate live connection to Cloud Firestore
 */
export async function testFirestoreConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const testRef = doc(db, 'academy_state', 'ping');
    await setDoc(testRef, {
      ping: true,
      timestamp: new Date().toISOString(),
      databaseId: firebaseConfig.firestoreDatabaseId,
    }, { merge: true });
    return {
      success: true,
      message: `Successfully connected to Cloud Firestore (Database: ${firebaseConfig.firestoreDatabaseId})!`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Failed to connect to Cloud Firestore.',
    };
  }
}

/**
 * Save full Academy State to Cloud Firestore using safe chunking
 * This prevents Firestore's 1MB single document size limit from failing writes.
 */
export async function saveStateToFirestore(state: AppState): Promise<boolean> {
  const manifestPath = 'academy_state/state_manifest';
  try {
    const stateCopy = {
      ...state,
      savedAt: new Date().toISOString(),
    };
    const serialized = JSON.stringify(stateCopy);
    const CHUNK_SIZE = 400000; // ~400 KB per chunk (well under Firestore's 1MB limit)
    const chunkCount = Math.max(1, Math.ceil(serialized.length / CHUNK_SIZE));

    // 1. Write the manifest first
    const manifestRef = doc(db, 'academy_state', 'state_manifest');
    await setDoc(manifestRef, {
      chunkCount,
      totalLength: serialized.length,
      version: state.version || 1,
      savedAt: stateCopy.savedAt,
    });

    // 2. Write all chunks
    const chunkPromises: Promise<void>[] = [];
    for (let i = 0; i < chunkCount; i++) {
      const chunkStr = serialized.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const chunkRef = doc(db, 'academy_state', `chunk_${i}`);
      chunkPromises.push(
        setDoc(chunkRef, {
          chunkIndex: i,
          dataJson: chunkStr,
          savedAt: stateCopy.savedAt,
        })
      );
    }
    await Promise.all(chunkPromises);

    // Also update legacy global_state if small enough (< 500KB) for backwards compatibility
    if (serialized.length < 500000) {
      const legacyRef = doc(db, 'academy_state', 'global_state');
      setDoc(legacyRef, {
        version: state.version || 1,
        savedAt: stateCopy.savedAt,
        dataJson: serialized,
      }, { merge: true }).catch(() => {});
    }

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, manifestPath);
    return false;
  }
}

/**
 * Load full Academy State from Cloud Firestore
 */
export async function loadStateFromFirestore(): Promise<AppState | null> {
  const manifestPath = 'academy_state/state_manifest';
  try {
    // 1. First check the chunked manifest
    const manifestRef = doc(db, 'academy_state', 'state_manifest');
    const manifestSnap = await getDoc(manifestRef);

    if (manifestSnap.exists()) {
      const manifestData = manifestSnap.data();
      const chunkCount = manifestData?.chunkCount || 1;

      // Fetch all chunks in parallel
      const chunkDocPromises = [];
      for (let i = 0; i < chunkCount; i++) {
        chunkDocPromises.push(getDoc(doc(db, 'academy_state', `chunk_${i}`)));
      }

      const chunkSnaps = await Promise.all(chunkDocPromises);
      let reconstructed = '';
      for (let i = 0; i < chunkSnaps.length; i++) {
        const snap = chunkSnaps[i];
        if (snap.exists()) {
          reconstructed += snap.data()?.dataJson || '';
        }
      }

      if (reconstructed) {
        return JSON.parse(reconstructed) as AppState;
      }
    }

    // 2. Fallback to legacy single document if manifest doesn't exist
    const legacyRef = doc(db, 'academy_state', 'global_state');
    const legacySnap = await getDoc(legacyRef);
    if (legacySnap.exists()) {
      const data = legacySnap.data();
      if (data?.dataJson) {
        return JSON.parse(data.dataJson) as AppState;
      }
    }

    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, manifestPath);
    return null;
  }
}
