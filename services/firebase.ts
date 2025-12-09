import firebase from "firebase/app";
import "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAapnShSKnDnucyyZPrtaGb2GbZ28mTQao",
  authDomain: "nolimpiadi-app.firebaseapp.com",
  projectId: "nolimpiadi-app",
  storageBucket: "nolimpiadi-app.firebasestorage.app",
  messagingSenderId: "329286637342",
  appId: "1:329286637342:web:b2d3087d70a1958e9a1b0f"
};

// Initialize Firebase (check apps to avoid duplicates)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const db = firebase.firestore();