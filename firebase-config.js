import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, set, get, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyArYbXK71V6cRwjSp6RZtTC4LOFygoD21M",
  authDomain: "scythe-206f4.firebaseapp.com",
  databaseURL: "https://scythe-206f4-default-rtdb.firebaseio.com",
  projectId: "scythe-206f4",
  storageBucket: "scythe-206f4.firebasestorage.app",
  messagingSenderId: "493809723869",
  appId: "1:493809723869:web:295b09f00a8ad515a7ae34"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database, ref, push, set, get, onValue, remove, update };
