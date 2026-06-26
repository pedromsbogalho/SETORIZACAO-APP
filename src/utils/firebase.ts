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
import firebaseConfig from '../../firebase-applet-config.json';
import { Person, Family, JohreiCenterStructure } from '../types';

// Load config from environment variables (useful for production Vercel/Netlify/Github Pages) or fallback to local JSON config
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

// We use a let-binding for db to allow fallback to the '(default)' database if the custom one is not found or fails
export let db = getFirestore(app, firestoreDatabaseId || '(default)');

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
    await withTimeout(getDocFromServer(doc(db, 'people', 'ping')), 1500);
    console.log(`Firebase connection to database "${firestoreDatabaseId}" verified successfully!`);
  } catch (error: any) {
    console.warn(`Connection to database "${firestoreDatabaseId}" failed:`, error);
    if (firestoreDatabaseId && firestoreDatabaseId !== '(default)') {
      console.log("Attempting to fall back to '(default)' database...");
      try {
        db = getFirestore(app, '(default)');
        await withTimeout(getDocFromServer(doc(db, 'people', 'ping')), 1500);
        console.log("Fallback to '(default)' database succeeded!");
      } catch (fallbackError) {
        console.error("Fallback to '(default)' database also failed:", fallbackError);
      }
    }
  }
}
testAndRecoverConnection();

// --- PEOPLE API ---

export async function fetchPeopleFromFirebase(): Promise<Person[]> {
  try {
    // Wrap with a timeout to fail fast and fall back to local storage instead of hanging forever
    const querySnapshot = await withTimeout(getDocs(collection(db, 'people')), 2500);
    const list: Person[] = [];
    querySnapshot.forEach((document) => {
      list.push(document.data() as Person);
    });
    return list;
  } catch (err) {
    console.error("Error fetching people from Firebase:", err);
    throw err;
  }
}

export async function savePersonToFirebase(person: Person): Promise<void> {
  try {
    await setDoc(doc(db, 'people', person.id), person);
  } catch (err) {
    console.error(`Error saving person ${person.id} to Firebase:`, err);
    throw err;
  }
}

export async function deletePersonFromFirebase(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'people', id));
  } catch (err) {
    console.error(`Error deleting person ${id} from Firebase:`, err);
    throw err;
  }
}

export async function savePeopleBatchToFirebase(peopleList: Person[]): Promise<void> {
  try {
    // Firestore batch limits writes to 500 per batch. We chunk the list into chunks of 450 to be safe.
    const CHUNK_SIZE = 450;
    for (let i = 0; i < peopleList.length; i += CHUNK_SIZE) {
      const chunk = peopleList.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(p => {
        const ref = doc(db, 'people', p.id);
        batch.set(ref, p);
      });
      await batch.commit();
    }
  } catch (err) {
    console.error("Error saving batch of people to Firebase:", err);
    throw err;
  }
}

// --- FAMILIES API ---

export async function fetchFamiliesFromFirebase(): Promise<Family[]> {
  try {
    const querySnapshot = await withTimeout(getDocs(collection(db, 'families')), 2500);
    const list: Family[] = [];
    querySnapshot.forEach((document) => {
      list.push(document.data() as Family);
    });
    return list;
  } catch (err) {
    console.error("Error fetching families from Firebase:", err);
    throw err;
  }
}

export async function saveFamilyToFirebase(family: Family): Promise<void> {
  try {
    await setDoc(doc(db, 'families', family.id), family);
  } catch (err) {
    console.error(`Error saving family ${family.id} to Firebase:`, err);
    throw err;
  }
}

export async function saveFamiliesBatchToFirebase(familiesList: Family[]): Promise<void> {
  try {
    const CHUNK_SIZE = 450;
    for (let i = 0; i < familiesList.length; i += CHUNK_SIZE) {
      const chunk = familiesList.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(f => {
        const ref = doc(db, 'families', f.id);
        batch.set(ref, f);
      });
      await batch.commit();
    }
  } catch (err) {
    console.error("Error saving batch of families to Firebase:", err);
    throw err;
  }
}

export async function deleteFamilyFromFirebase(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'families', id));
  } catch (err) {
    console.error(`Error deleting family ${id} from Firebase:`, err);
    throw err;
  }
}

// --- STRUCTURE API ---

const STRUCTURE_DOC_ID = 'current_structure';

export async function fetchStructureFromFirebase(): Promise<JohreiCenterStructure | null> {
  try {
    const docSnap = await withTimeout(getDoc(doc(db, 'structures', STRUCTURE_DOC_ID)), 2500);
    if (docSnap.exists()) {
      return docSnap.data() as JohreiCenterStructure;
    }
    return null;
  } catch (err) {
    console.error("Error fetching structure from Firebase:", err);
    return null;
  }
}

export async function saveStructureToFirebase(structure: JohreiCenterStructure): Promise<void> {
  try {
    await setDoc(doc(db, 'structures', STRUCTURE_DOC_ID), structure);
  } catch (err) {
    console.error("Error saving structure to Firebase:", err);
    throw err;
  }
}

// --- RESET ALL DATA API ---

export async function clearAllFirebaseData(): Promise<void> {
  try {
    // Note: client side clear of full collections is usually done by reading and deleting.
    // Since our DB size is small, we query and delete.
    const peopleSnap = await getDocs(collection(db, 'people'));
    const peopleBatch = writeBatch(db);
    peopleSnap.forEach(d => {
      peopleBatch.delete(doc(db, 'people', d.id));
    });
    await peopleBatch.commit();

    const familiesSnap = await getDocs(collection(db, 'families'));
    const familiesBatch = writeBatch(db);
    familiesSnap.forEach(d => {
      familiesBatch.delete(doc(db, 'families', d.id));
    });
    await familiesBatch.commit();

    await deleteDoc(doc(db, 'structures', STRUCTURE_DOC_ID));
  } catch (err) {
    console.error("Error clearing data from Firebase:", err);
    throw err;
  }
}
