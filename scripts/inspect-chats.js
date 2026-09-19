const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, limit, query } = require('firebase/firestore');

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

async function run() {
  console.log("--- CHATS COLLECTION ---");
  const chatsSnap = await getDocs(query(collection(db, "chats"), limit(30)));
  console.log("Total chats found:", chatsSnap.size);
  chatsSnap.forEach((doc) => {
    const data = doc.data();
    console.log({
      id: doc.id,
      participants: data.participants,
      participantNames: data.participantNames,
      type: data.type,
      lastMessage: data.lastMessage?.text ? "(has text)" : null,
      createdAt: data.createdAt
    });
  });

  console.log("--- USERS COLLECTION ---");
  const usersSnap = await getDocs(query(collection(db, "users"), limit(20)));
  console.log("Total users found:", usersSnap.size);
  usersSnap.forEach((doc) => {
    const data = doc.data();
    console.log({
      id: doc.id,
      uid: data.uid,
      userCode: data.userCode,
      displayName: data.displayName
    });
  });
  process.exit(0);
}

run().catch(console.error);
