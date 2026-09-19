const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, deleteDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBUlsPbGCznAkncC7tZjRfDYMoTC0H_QaI",
  authDomain: "rubber-f0574.firebaseapp.com",
  projectId: "rubber-f0574",
  storageBucket: "rubber-f0574.firebasestorage.app",
  messagingSenderId: "608921253339",
  appId: "1:608921253339:web:35e350e02608777fab23fe",
  databaseURL: "https://rubber-f0574-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanChats() {
  console.log("Cleaning up old test chats...");
  const chatsSnap = await getDocs(collection(db, "chats"));
  console.log(`Found ${chatsSnap.size} chats to clean.`);

  for (const chatDoc of chatsSnap.docs) {
    // Delete messages subcollection
    const messagesSnap = await getDocs(collection(db, "chats", chatDoc.id, "messages"));
    for (const msg of messagesSnap.docs) {
      await deleteDoc(doc(db, "chats", chatDoc.id, "messages", msg.id));
    }
    await deleteDoc(doc(db, "chats", chatDoc.id));
    console.log(`Deleted chat: ${chatDoc.id}`);
  }

  console.log("All old test chats deleted successfully!");
  process.exit(0);
}

cleanChats().catch(console.error);
