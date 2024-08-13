// firebase.js
const admin = require('firebase-admin');
const serviceAccount = require('./menu-2a858-firebase-adminsdk-pv2qz-2e6949aceb.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'https://console.firebase.google.com/u/0/project/menu-2a858/storage/menu-2a858.appspot.com/files?hl=es-419'
});

const bucket = admin.storage().bucket();
module.exports = bucket;
