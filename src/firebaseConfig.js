import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously} from 'firebase/auth';
import { getDatabase, ref, set, onValue } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyC1qA6JojEHl1uzRKWkuPnFUx7_uqKRJJU",
  authDomain: "mama-fua-e15c0.firebaseapp.com",
  databaseURL: "https://mama-fua-e15c0-default-rtdb.firebaseio.com",
  projectId: "mama-fua-e15c0",
  storageBucket: "mama-fua-e15c0.firebasestorage.app",
  messagingSenderId: "616060985493",
  appId: "1:616060985493:web:97b6743bff35db56897b9c",
  measurementId: "G-SW4DG8QEM6"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const firestore = getFirestore(app);
const auth = getAuth(app);

export { database, app , firestore, auth, signInAnonymously, ref, set, onValue };


// // Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// // TODO: Add SDKs for Firebase products that you want to use
// // https://firebase.google.com/docs/web/setup#available-libraries

// // Your web app's Firebase configuration
// // For Firebase JS SDK v7.20.0 and later, measurementId is optional
// const firebaseConfig = {
//   apiKey: "AIzaSyC1qA6JojEHl1uzRKWkuPnFUx7_uqKRJJU",
//   authDomain: "mama-fua-e15c0.firebaseapp.com",
//   databaseURL: "https://mama-fua-e15c0-default-rtdb.firebaseio.com",
//   projectId: "mama-fua-e15c0",
//   storageBucket: "mama-fua-e15c0.firebasestorage.app",
//   messagingSenderId: "616060985493",
//   appId: "1:616060985493:web:97b6743bff35db56897b9c",
//   measurementId: "G-SW4DG8QEM6"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);