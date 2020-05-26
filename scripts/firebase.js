let firebaseConfig = {
  apiKey: "AIzaSyBOo-_IqO9EQXTjiKftDpgj4WTGHcM6xGk",
  authDomain: "schoolclasssystem.firebaseapp.com",
  databaseURL: "https://schoolclasssystem.firebaseio.com",
  projectId: "schoolclasssystem",
  storageBucket: "schoolclasssystem.appspot.com",
  messagingSenderId: "176684894813",
  appId: "1:176684894813:web:3b60871ddf050563cf9bb4",
  measurementId: "G-KDSKSX1VEK"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

let database = firebase.database();