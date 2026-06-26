/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc, 
  writeBatch,
  deleteDoc,
  getDocFromServer
} from 'firebase/firestore';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Person, Family, JohreiCenterStructure } from '../types';

// Load config from environment variables (useful for production) or fallback to local JSON config
const metaEnv = (import.meta as any).env || {};
const apiKey = metaEnv.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey;
const authDomain = metaEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain;
const projectId = metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId;
const storageBucket = metaEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket;
const messagingSenderId = metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId;
const appId = metaEnv.VITE_FIREBASE_APP_ID || firebaseConfig.appId;

const firestoreDatabaseId = metaEnv.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || '(default)';

// Initialize Firebase App
const app = initializeApp({
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
});

// We use a let-binding for db to allow fallback to the '(default)' database
export let db = getFirestore(app, firestoreDatabaseId || '(default)');
export const auth = getAuth(app);

// Helper function to enforce a timeout on asynchronous operations
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 2500): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout of ${timeoutMs}ms exceeded while connecting to Firebase`));
    }, timeoutMs);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Test connection and auto-recovery to (default) database if custom db is not accessible
async function testAndRecoverConnection() {
  try {
    // If user is unauthenticated, this might fail with permission-denied, which is normal and means we successfully reached Firestore!
    await withTimeout(getDocFromServer(doc(db, 'test_connection_ping', 'ping')), 1500);
    console.log(`Firebase connection to database "${firestoreDatabaseId}" verified successfully!`);
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.log(`Firebase connection verified successfully (security rules active).`);
      return;
    }
    console.warn(`Connection to database "${firestoreDatabaseId}" failed:`, error);
    if (firestoreDatabaseId && firestoreDatabaseId !== '(default)') {
      console.log("Attempting to fall back to '(default)' database...");
      try {
        db = getFirestore(app, '(default)');
        await withTimeout(getDocFromServer(doc(db, 'test_connection_ping', 'ping')), 1500);
        console.log("Fallback to '(default)' database succeeded!");
      } catch (fallbackError: any) {
        if (fallbackError?.code === 'permission-denied') {
          console.log("Fallback to '(default)' database succeeded (security rules active)!");
          return;
        }
        console.error("Fallback to '(default)' database also failed:", fallbackError);
      }
    }
  }
}
testAndRecoverConnection();

// --- ERROR HANDLING SPECIFICATION (Section 3 of Skill) ---

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
  }
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
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- AUTHENTICATION HELPERS ---

export function mapUsernameToEmail(username: string): string {
  // Clean username and format as dummy domain email
  const sanitized = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  return `${sanitized}@jornadajc.app.local`;
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (err) {
    console.error("Error signing in with Google:", err);
    throw err;
  }
}

export async function registerWithUsernameAndPassword(username: string, password: string): Promise<User> {
  const email = mapUsernameToEmail(username);
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (err) {
    console.error("Error registering with username/password:", err);
    throw err;
  }
}

export async function signInWithUsernameAndPassword(username: string, password: string): Promise<User> {
  const email = mapUsernameToEmail(username);
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (err) {
    console.error("Error signing in with username/password:", err);
    throw err;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.error("Error signing out:", err);
    throw err;
  }
}

// --- PEOPLE API (USER-SCOPED) ---

export async function fetchPeopleFromFirebase(userId: string): Promise<Person[]> {
  const path = `users/${userId}/people`;
  try {
    const querySnapshot = await withTimeout(getDocs(collection(db, 'users', userId, 'people')), 2500);
    const list: Person[] = [];
    querySnapshot.forEach((document) => {
      list.push(document.data() as Person);
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return []; // Never reached as handleFirestoreError throws, but satisfies TS
  }
}

export async function savePersonToFirebase(userId: string, person: Person): Promise<void> {
  const path = `users/${userId}/people/${person.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'people', person.id), person);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deletePersonFromFirebase(userId: string, id: string): Promise<void> {
  const path = `users/${userId}/people/${id}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'people', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function savePeopleBatchToFirebase(userId: string, peopleList: Person[]): Promise<void> {
  const basePath = `users/${userId}/people`;
  try {
    const CHUNK_SIZE = 450;
    for (let i = 0; i < peopleList.length; i += CHUNK_SIZE) {
      const chunk = peopleList.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(p => {
        const ref = doc(db, 'users', userId, 'people', p.id);
        batch.set(ref, p);
      });
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, basePath);
  }
}

// --- FAMILIES API (USER-SCOPED, though derived dynamically, kept for backward compatibility) ---

export async function fetchFamiliesFromFirebase(userId: string): Promise<Family[]> {
  const path = `users/${userId}/families`;
  try {
    const querySnapshot = await withTimeout(getDocs(collection(db, 'users', userId, 'families')), 2500);
    const list: Family[] = [];
    querySnapshot.forEach((document) => {
      list.push(document.data() as Family);
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return [];
  }
}

export async function saveFamilyToFirebase(userId: string, family: Family): Promise<void> {
  const path = `users/${userId}/families/${family.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'families', family.id), family);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveFamiliesBatchToFirebase(userId: string, familiesList: Family[]): Promise<void> {
  const basePath = `users/${userId}/families`;
  try {
    const CHUNK_SIZE = 450;
    for (let i = 0; i < familiesList.length; i += CHUNK_SIZE) {
      const chunk = familiesList.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(f => {
        const ref = doc(db, 'users', userId, 'families', f.id);
        batch.set(ref, f);
      });
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, basePath);
  }
}

export async function deleteFamilyFromFirebase(userId: string, id: string): Promise<void> {
  const path = `users/${userId}/families/${id}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'families', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- STRUCTURE API (USER-SCOPED) ---

const STRUCTURE_DOC_ID = 'current_structure';

export async function fetchStructureFromFirebase(userId: string): Promise<JohreiCenterStructure | null> {
  const path = `users/${userId}/structures/${STRUCTURE_DOC_ID}`;
  try {
    const docSnap = await withTimeout(getDoc(doc(db, 'users', userId, 'structures', STRUCTURE_DOC_ID)), 2500);
    if (docSnap.exists()) {
      return docSnap.data() as JohreiCenterStructure;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

export async function saveStructureToFirebase(userId: string, structure: JohreiCenterStructure): Promise<void> {
  const path = `users/${userId}/structures/${STRUCTURE_DOC_ID}`;
  try {
    await setDoc(doc(db, 'users', userId, 'structures', STRUCTURE_DOC_ID), structure);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// --- RESET ALL DATA API (USER-SCOPED) ---

export async function clearAllFirebaseData(userId: string): Promise<void> {
  try {
    const peopleSnap = await getDocs(collection(db, 'users', userId, 'people'));
    const peopleBatch = writeBatch(db);
    peopleSnap.forEach(d => {
      peopleBatch.delete(doc(db, 'users', userId, 'people', d.id));
    });
    await peopleBatch.commit();

    const familiesSnap = await getDocs(collection(db, 'users', userId, 'families'));
    const familiesBatch = writeBatch(db);
    familiesSnap.forEach(d => {
      familiesBatch.delete(doc(db, 'users', userId, 'families', d.id));
    });
    await familiesBatch.commit();

    await deleteDoc(doc(db, 'users', userId, 'structures', STRUCTURE_DOC_ID));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
  }
}
