INSTRUCCIONES PARA DESPLEGAR

1) Reemplaza los valores TU_API_KEY, TU_PROJECTID, etc. en app.js y firebase-messaging-sw.js con los de tu proyecto Firebase (Project settings > General > Your apps).

2) En Firebase Console -> Firestore -> Rules, mientras pruebas coloca:
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
Recuerda cambiar estas reglas en producción.

3) Para notificaciones en background:
- Habilita Cloud Messaging en Firebase.
- Genera clave VAPID si deseas.
- Deploy de Cloud Functions y Hosting (instrucciones abajo).

4) Para desplegar con Firebase Hosting + Functions:
- Instala Firebase CLI: npm install -g firebase-tools
- firebase login
- firebase init (elige Hosting y Functions)
- Copia los archivos en public/ (index.html, styles.css, app.js, manifest.json, firebase-messaging-sw.js, service-worker.js, icons, alarm.mp3)
- En functions/ pega el código proporcionado en functions/index.js y package.json
- firebase deploy --only hosting,functions

5) Las notificaciones push se envían desde una Cloud Function programada (functions/index.js). Asegúrate de desplegar las funciones con firebase deploy.

