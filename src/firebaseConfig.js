// src/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue } from 'firebase/database';

const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "yourapp.firebaseapp.com",
  databaseURL: "https://yourapp-default-rtdb.firebaseio.com",
  projectId: "yourapp-id",
  storageBucket: "yourapp.appspot.com",
  messagingSenderId: "xxxxxx",
  appId: "xxxxxxx"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database, ref, set, onValue };
