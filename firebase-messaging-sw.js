importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTHDOMAIN",
  projectId: "TU_PROJECTID",
  messagingSenderId: "TU_SENDERID",
  appId: "TU_APPID"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const title = payload.notification?.title || 'Aviso J.Diaz.eu';
  const options = {
    body: payload.notification?.body || '',
    icon: 'icon-192.png',
    data: payload.data || {}
  };
  self.registration.showNotification(title, options);
});
