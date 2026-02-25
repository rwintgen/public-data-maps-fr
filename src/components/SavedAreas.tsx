
'use client'

import { useState, useEffect } from 'react'
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, onSnapshot, query, where } from "firebase/firestore";
import { app } from '@/lib/firebase';

const auth = getAuth(app);
const db = getFirestore(app);

export default function SavedAreas({ onSelectArea, currentSearchArea }: { onSelectArea: (geometry: any) => void, currentSearchArea: any }) {
  const [savedAreas, setSavedAreas] = useState<any[]>([])
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        const q = query(collection(db, "savedAreas"), where("userId", "==", user.uid));
        const unsub = onSnapshot(q, (querySnapshot) => {
          const areas: any[] = [];
          querySnapshot.forEach((doc) => {
            areas.push({ id: doc.id, ...doc.data() });
          });
          setSavedAreas(areas);
        });
        return () => unsub();
      } else {
        setUser(null);
        setSavedAreas([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (user && currentSearchArea) {
      const areaName = prompt("Enter a name for this area:");
      if (areaName) {
        await addDoc(collection(db, "savedAreas"), {
          name: areaName,
          userId: user.uid,
          geometry: currentSearchArea,
          timestamp: new Date(),
        });
      }
    } else if (!currentSearchArea) {
      alert("Please draw an area on the map first.");
    }
  }

  const handleSignIn = () => {
    signInWithPopup(auth, new GoogleAuthProvider());
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-2">Saved Areas</h3>
      {user ? (
        <>
          <button onClick={handleSignOut} className="mb-2 px-4 py-2 bg-red-500 text-white rounded">Sign Out</button>
          <ul>
            {savedAreas.map((area, index) => (
              <li key={index} onClick={() => onSelectArea(area.geometry)} className="cursor-pointer hover:bg-gray-200 p-2 rounded">
                {area.name}
              </li>
            ))}
          </ul>
          <button onClick={handleSave} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">Save Current Area</button>
        </>
      ) : (
        <button onClick={handleSignIn} className="px-4 py-2 bg-blue-500 text-white rounded">Sign In to Save Areas</button>
      )}
    </div>
  )
}
