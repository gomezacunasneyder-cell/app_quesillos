import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC4V2LUd1Uysairzg3KN5rMEumw9zc8rss",
  authDomain: "quesillos-emmanuel.firebaseapp.com",
  projectId: "quesillos-emmanuel",
  storageBucket: "quesillos-emmanuel.firebasestorage.app",
  messagingSenderId: "833748283532",
  appId: "1:833748283532:web:b9e928a66976757deacba9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
