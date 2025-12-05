// === CONFIGURA ESTO con tus credenciales de Firebase ===
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTHDOMAIN",
  projectId: "TU_PROJECTID",
  messagingSenderId: "TU_SENDERID",
  appId: "TU_APPID"
};
// =======================================================

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const messaging = firebase.messaging();

const btnGuardar = document.getElementById('btnGuardar');
const btnLimpiar = document.getElementById('btnLimpiar');
const lista = document.getElementById('lista');
const snd = document.getElementById('sound');

btnGuardar.addEventListener('click', crearActividad);
btnLimpiar.addEventListener('click', limpiarTodo);

const filtroEstado = document.getElementById('filtroEstado');

filtroEstado.addEventListener('change', renderLista);

// PEDIR PERMISO NOTIFICACIONES y obtener token FCM
async function pedirPermisos() {
  try {
    const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') {
      console.log('Permiso notificaciones denegado');
      return;
    }
    const vapidKey = null; // opcional: si generas VAPID key ponla en server-side al enviar tokens
    const token = await messaging.getToken({ vapidKey: vapidKey || undefined });
    console.log('Token FCM:', token);
    // opcional: guarda token en Firestore para envío dirigido
    // await db.collection('clients').doc(token).set({token, createdAt: Date.now()})
  } catch (e) {
    console.error('Error permisos noti:', e);
  }
}
pedirPermisos();

// Crear actividad en Firestore
async function crearActividad(){
  const nombre = document.getElementById('inputNombre').value.trim();
  const zona = document.getElementById('selectZona').value;
  const fecha = document.getElementById('inputFecha').value;
  const hora = document.getElementById('inputHora').value;

  if (!nombre || !fecha || !hora) { alert('Completa nombre, fecha y hora'); return; }

  const fechaHoraISO = fecha + 'T' + hora + ':00'; // yyyy-mm-ddThh:mm:ss
  const doc = {
    nombre, zona, fecha, hora, fechaHoraISO,
    completada: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  await db.collection('actividades').add(doc);
  // limpiar inputs
  document.getElementById('inputNombre').value = '';
  document.getElementById('inputFecha').value = '';
  document.getElementById('inputHora').value = '';
}

// Limpiar TODO (atención: elimina colección localmente desde UI)
async function limpiarTodo(){
  if (!confirm('¿Eliminar todas las actividades? Esta acción es irreversible.')) return;
  const snap = await db.collection('actividades').get();
  const batch = db.batch();
  snap.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

// Render en tiempo real
db.collection('actividades').orderBy('fechaHoraISO','asc')
  .onSnapshot(snapshot => {
    const datos = [];
    snapshot.forEach(doc => datos.push({id: doc.id, ...doc.data()}));
    renderLista(datos);
  });

function renderLista(data){
  // data recibido desde snapshot o undefined -> tomar snapshot en tiempo real
  if (!data) {
    // request snapshot quickly (if called por filtro)
    db.collection('actividades').orderBy('fechaHoraISO','asc').get().then(snap=>{
      const arr=[]; snap.forEach(d=>arr.push({id:d.id,...d.data()})); renderLista(arr);
    });
    return;
  }

  const filtro = filtroEstado.value;
  lista.innerHTML = '';
  const ahora = new Date();

  data.forEach(item => {
    const fechaItem = new Date(item.fechaHoraISO);
    const isLate = !item.completada && fechaItem < ahora;
    if (filtro === 'pending' && (item.completada || isLate)) return;
    if (filtro === 'done' && !item.completada) return;
    if (filtro === 'late' && !isLate) return;

    const card = document.createElement('div'); card.className = 'task';
    const info = document.createElement('div'); info.className = 'info';
    const title = document.createElement('div'); title.innerHTML = `<strong ${item.completada ? 'class="status-done"' : ''}>${item.nombre}</strong>`;
    const meta = document.createElement('div'); meta.className = 'meta';
    meta.textContent = `${item.zona} • ${item.fecha} ${item.hora}`;

    if (item.completada) meta.innerHTML += ' • <span class="status-done">Completada</span>';
    else if (isLate) meta.innerHTML += ' • <span class="status-late">Retrasada</span>';

    info.appendChild(title); info.appendChild(meta);

    const actions = document.createElement('div'); actions.className = 'actions';
    const btnDone = document.createElement('button'); btnDone.className='small green'; btnDone.textContent = item.completada ? 'Deshacer' : 'Completada';
    btnDone.onclick = ()=> toggleCompletada(item.id, item.completada);
    const btnDelete = document.createElement('button'); btnDelete.className='small red'; btnDelete.textContent='Eliminar';
    btnDelete.onclick = ()=> eliminar(item.id);
    const btnEdit = document.createElement('button'); btnEdit.className='small gray'; btnEdit.textContent='Editar';
    btnEdit.onclick = ()=> editar(item);

    actions.appendChild(btnDone); actions.appendChild(btnEdit); actions.appendChild(btnDelete);

    card.appendChild(info); card.appendChild(actions);
    lista.appendChild(card);
  });
}

// acciones: completar, editar, eliminar
async function toggleCompletada(id, estado){
  await db.collection('actividades').doc(id).update({ completada: !estado });
}

async function eliminar(id){
  if (!confirm('Eliminar actividad?')) return;
  await db.collection('actividades').doc(id).delete();
}

async function editar(item){
  const nuevo = prompt('Editar nombre:', item.nombre);
  if (nuevo === null) return;
  if (nuevo.trim()==='') return alert('Nombre vacio no permitido');
  await db.collection('actividades').doc(item.id).update({ nombre: nuevo.trim() });
}

// Cuando la app está abierta, opcional: reproducir sonido si hay actividades para ahora
setInterval(async ()=>{
  const ahora = new Date();
  const ahoraISO = ahora.toISOString().slice(0,16); // 'YYYY-MM-DDTHH:mm'
  // buscamos actividades cuyo fechaHoraISO coincida en minuto actual y no estén completadas
  const q = await db.collection('actividades')
    .where('completada','==',false)
    .where('fechaHoraISO','<=', ahora.toISOString())
    .get();
  q.forEach(doc=>{
    const d = doc.data();
    const fechaItem = new Date(d.fechaHoraISO);
    // reproducir sonido (solo si están dentro del mismo minuto)
    if ( Math.abs(fechaItem - ahora) < 1000*60 ) {
      try{ snd.play().catch(()=>{}); }catch(e){}
      // mostrar notificación local (además de la que enviará la Cloud Function)
      if (Notification.permission === 'granted') new Notification('Actividad ahora', { body: d.nombre });
    }
  });
}, 60*1000); // revisar cada minuto
