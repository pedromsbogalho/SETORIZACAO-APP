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

// Initialize Firebase App
const app = initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
});

// Initialize Firestore with custom database ID via getFirestore(app, databaseId)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

// Test connection on boot to comply with validation directive
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'people', 'ping'));
    console.log("Firebase connection verified successfully!");
  } catch (error) {
    console.warn("Could not connect to online Firestore directly, operating in offline/local fallback mode:", error);
  }
}
testConnection();

// --- PEOPLE API ---

export async function fetchPeopleFromFirebase(): Promise<Person[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'people'));
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
    const querySnapshot = await getDocs(collection(db, 'families'));
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
    const docSnap = await getDoc(doc(db, 'structures', STRUCTURE_DOC_ID));
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
