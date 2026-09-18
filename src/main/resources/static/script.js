// Cliente STOMP (libreria stomp.js), se crea recien cuando nos conectamos.
// Mientras no nos conectamos queda en null.
let stompClient = null;

// Usuario con el que nos conectamos. Se guarda al conectar y se usa despues
// en showMessage() para decidir si un mensaje privado es para nosotros.
let miUsuario = null;

// Modo de envio actual: 'publico' o 'privado'. Arranca en 'privado' porque
// asi lo pide la interfaz (el radio "Privado" viene marcado por defecto).
let modo = 'privado';

/**
 * Cambia el modo de envio (publico/privado) y actualiza la interfaz:
 * - sincroniza los radio buttons con los botones Publico/Privado (y viceversa),
 * - muestra/oculta y habilita/deshabilita el input Destinatario.
 * No envia ningun mensaje, solo cambia el estado de la pantalla.
 */
function setModo(nuevoModo) {
    modo = nuevoModo;

    document.getElementById('modoPublicoRadio').checked = (modo === 'publico');
    document.getElementById('modoPrivadoRadio').checked = (modo === 'privado');

    const destinatarioInput = document.getElementById('destinatario');
    destinatarioInput.hidden = (modo !== 'privado');
    destinatarioInput.disabled = (modo !== 'privado');

    document.getElementById('btnModoPublico').classList.toggle('active', modo === 'publico');
    document.getElementById('btnModoPrivado').classList.toggle('active', modo === 'privado');
}

/**
 * Se ejecuta al tocar el boton "Conectar".
 * Abre un socket con SockJS (simula un WebSocket, con fallback para
 * navegadores viejos que no lo soportan) y lo envuelve con el cliente STOMP.
 */
function connect() {
    const serverIp = document.getElementById('serverIp').value;
    miUsuario = document.getElementById('username').value;

    // OJO: esta URL tiene que apuntar al mismo endpoint que registra
    // WebSocketConfig.registerStompEndpoints(...) en el backend (mismo path).
    // Le agregamos "?username=..." para que CustomHandshakeHandler (backend)
    // pueda asociarle un Principal a esta conexion: sin eso, el servidor no
    // tiene forma de mandarnos mensajes privados (necesario para las
    // videollamadas, ver mas abajo). El chat de texto no depende de esto.
    const socket = new SockJS("http://" + serverIp + ":8080/chat?username=" + encodeURIComponent(miUsuario));
    stompClient = Stomp.over(socket);

    // stompClient.connect(headers, callbackExito, callbackError)
    stompClient.connect({}, function (frame){
    setConnected(true);
    console.log('Connected: ' + frame);
    // Nos suscribimos al canal publico: cada vez que el servidor publique
    // algo en /topic/public, este callback se ejecuta con ese mensaje.
    stompClient.subscribe('/topic/public', function (message) {
        showMessage(JSON.parse(message.body));
    });

    // Canal privado de señalizacion para videollamadas: a diferencia de
    // /topic/public, aca SOLO llegan los mensajes que el backend nos manda
    // especificamente a nosotros (convertAndSendToUser en SignalingController).
    stompClient.subscribe('/user/queue/call', function (message) {
        manejarSenalDeLlamada(JSON.parse(message.body));
    });
}, function (error) {
    // Se llama si falla la conexion (servidor caido, endpoint mal escrito, etc.)
    console.error('Error connecting to WebSocket:', error);
    setConnected(false);
});

    //conexion y subcripcion
}

/**
 * Se ejecuta al tocar el boton "Desconectar".
 * Cierra la sesion STOMP y actualiza la interfaz.
 */
function disconnect() {
    // Desconectar
    colgarLlamada(); // si habia una llamada activa, la cortamos y liberamos la camara
    if (stompClient !== null) {
        stompClient.disconnect();
    }
    setConnected(false);
    console.log("Disconnected");
}


/**
 * Actualiza el indicador visual de estado (Conectado/Desconectado)
 * y habilita/deshabilita el input de mensaje segun corresponda.
 */
function setConnected(connected) {
    const status = document.getElementById('status');
    if (connected) {
        status.className = 'connected';
        status.textContent = 'Conectado';
    } else {
        status.className = 'disconnected';
        status.textContent = 'Desconectado';
    }
    document.getElementById('message').disabled = !connected;
}

/**
 * Se ejecuta al tocar "Enviar" (o Enter). Toma lo que escribio el usuario
 * y lo manda al servidor por el canal "/app/chat.sendMessage".
 *
 * El backend (ChatController.enviarMensaje) lo recibe y lo retransmite a
 * /topic/public, de donde lo vamos a recibir de vuelta via subscribe()
 * (por eso el propio remitente tambien ve su mensaje aparecer).
 *
 * El campo "destinatario" define si es publico o privado, segun el modo
 * elegido con los radios/botones Publico-Privado:
 * - modo 'publico' -> destinatario = "TODOS" (lo ve cualquiera en el chat).
 * - modo 'privado' -> destinatario = lo que haya en el input Destinatario
 *   (solo se le va a mostrar a esa persona; el filtro lo hace showMessage()
 *   de cada cliente).
 */
function sendMessage() {
    const username = document.getElementById('username').value;
    const content = document.getElementById('message').value;

    if (content.trim() === '') return;

    let destinatario;
    if (modo === 'publico') {
        destinatario = 'TODOS';
    } else {
        destinatario = document.getElementById('destinatario').value.trim();
        if (destinatario === '') return; // modo privado sin destinatario: no hay a quien mandarlo
    }

    // El objeto que mandamos tiene que tener la misma forma que el
    // record ChatMessage del backend: tipo, usuario, contenido, destinatario.
    stompClient.send("/app/chat.sendMessage", {}, JSON.stringify({
        tipo: 'CHAT',
        usuario: username,
        contenido: content,
        destinatario: destinatario
    }));

     // Conexion

    document.getElementById('message').value = '';
}

/**
 * Pinta un mensaje recibido en la lista de mensajes del chat.
 * Se llama desde el callback de subscribe() en connect().
 *
 * OJO: por como esta armado el broker, este callback se dispara para
 * TODOS los mensajes que pasan por /topic/public, sean publicos o
 * privados. Por eso primero filtramos: si el mensaje es privado
 * (destinatario distinto de "TODOS") y no es ni para nosotros ni
 * mandado por nosotros mismos, ni lo mostramos.
 */
function showMessage(message) {
    const esPublico = !message.destinatario || message.destinatario === 'TODOS';
    const esParaMi = message.destinatario === miUsuario;
    const loMandeYo = message.usuario === miUsuario;

    if (!esPublico && !esParaMi && !loMandeYo) {
        return; // mensaje privado que no nos corresponde: lo ignoramos
    }

    const messages = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = esPublico ? 'message' : 'message message-privado';

    const etiqueta = esPublico ? '' : ' (privado)';
    messageDiv.innerHTML = '<strong>' + message.usuario + etiqueta + ':</strong> ' + message.contenido;
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight; // auto-scroll al ultimo mensaje
}

// Permite mandar el mensaje presionando Enter, sin tener que tocar el boton
document.getElementById('message').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Estado inicial de la interfaz: modo Privado, como pide el radio marcado por defecto.
setModo('privado');


// ============================================================================
// VIDEOLLAMADA (WebRTC) - funcionalidad APARTE del chat de texto.
// No toca /chat.sendMessage ni /topic/public: usa su propio canal privado
// (/user/queue/call, ver connect() mas arriba) y sus propios endpoints
// (/app/call.offer, /app/call.answer, /app/call.ice) para señalizacion.
//
// El audio/video en si NUNCA pasa por el servidor: viaja directo entre los
// dos navegadores (peer-to-peer) una vez que RTCPeerConnection termina de
// negociar la conexion. El WebSocket/STOMP solo se usa para que ambos lados
// se pongan de acuerdo (mandarse la offer, la answer, y los ICE candidates).
// ============================================================================

// Configuracion de RTCPeerConnection. Por ahora sin STUN/TURN porque estamos
// en la red local de la facultad (los candidatos "host" alcanzan para
// conectar directo). Si mas adelante hace falta cruzar NAT o salir a
// internet, un ICE server externo se agregaria aca, por ejemplo:
//   iceServers: [
//       { urls: 'stun:stun.l.google.com:19302' },                 // STUN publico
//       { urls: 'turn:mi-servidor:3478', username: '...', credential: '...' } // TURN propio
//   ]
const RTC_CONFIG = {
    iceServers: []
};

let peerConnection = null;   // la conexion WebRTC actual (null si no hay llamada)
let localStream = null;      // nuestro audio/video (camara/microfono)
let llamadaConUsuario = null; // con quien estamos hablando (o intentando hablar)
let ofertaEntrante = null;   // offer que llego y todavia no se acepto/rechazo

/**
 * Crea y configura un RTCPeerConnection nuevo para hablar con "otroUsuario":
 * - agrega nuestras pistas de audio/video (localStream) para que las reciba
 *   el otro lado,
 * - cada vez que el navegador descubre un ICE candidate propio, lo manda
 *   por STOMP al otro usuario (/app/call.ice),
 * - cuando llega el video/audio remoto, lo conecta al <video id="remoteVideo">.
 */
function crearPeerConnection(otroUsuario) {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    pc.onicecandidate = function (event) {
        if (event.candidate) {
            stompClient.send('/app/call.ice', {}, JSON.stringify({
                tipo: 'ICE_CANDIDATE',
                emisor: miUsuario,
                destinatario: otroUsuario,
                payload: event.candidate
            }));
        }
    };

    pc.ontrack = function (event) {
        document.getElementById('remoteVideo').srcObject = event.streams[0];
    };

    localStream.getTracks().forEach(function (track) {
        pc.addTrack(track, localStream);
    });

    return pc;
}

/**
 * Se ejecuta al tocar "Llamar". Pide permiso de camara/microfono, crea la
 * conexion WebRTC, genera la offer SDP y la manda al usuario indicado en
 * el input "Usuario a llamar" (/app/call.offer).
 */
async function iniciarLlamada() {
    const destinatario = document.getElementById('callTarget').value.trim();
    if (destinatario === '') return;
    if (stompClient === null) {
        console.error('Tenes que conectarte al chat antes de llamar.');
        return;
    }

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    } catch (error) {
        console.error('No se pudo acceder a la camara/microfono:', error);
        return;
    }
    document.getElementById('localVideo').srcObject = localStream;

    llamadaConUsuario = destinatario;
    peerConnection = crearPeerConnection(destinatario);

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    stompClient.send('/app/call.offer', {}, JSON.stringify({
        tipo: 'OFFER',
        emisor: miUsuario,
        destinatario: destinatario,
        payload: offer
    }));

    document.getElementById('btnColgar').hidden = false;
}

/**
 * Muestra el aviso de "llamada entrante" con los botones Aceptar/Rechazar,
 * cuando llega una OFFER por /user/queue/call.
 */
function mostrarLlamadaEntrante(senal) {
    ofertaEntrante = senal;
    document.getElementById('incomingCallText').textContent = senal.emisor + ' te esta llamando...';
    document.getElementById('incomingCall').hidden = false;
}

/**
 * Se ejecuta al tocar "Aceptar" en el aviso de llamada entrante: pide
 * camara/microfono, crea su propio RTCPeerConnection, aplica la offer
 * recibida, genera la answer y la manda de vuelta (/app/call.answer).
 */
async function aceptarLlamada() {
    if (ofertaEntrante === null) return;
    const llamante = ofertaEntrante.emisor;

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    } catch (error) {
        console.error('No se pudo acceder a la camara/microfono:', error);
        ofertaEntrante = null;
        document.getElementById('incomingCall').hidden = true;
        return;
    }
    document.getElementById('localVideo').srcObject = localStream;

    llamadaConUsuario = llamante;
    peerConnection = crearPeerConnection(llamante);

    await peerConnection.setRemoteDescription(new RTCSessionDescription(ofertaEntrante.payload));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    stompClient.send('/app/call.answer', {}, JSON.stringify({
        tipo: 'ANSWER',
        emisor: miUsuario,
        destinatario: llamante,
        payload: answer
    }));

    document.getElementById('incomingCall').hidden = true;
    document.getElementById('btnColgar').hidden = false;
    ofertaEntrante = null;
}

/**
 * Se ejecuta al tocar "Rechazar". El enunciado solo pide 3 endpoints
 * (offer/answer/ice), asi que para avisarle al que llama que rechazamos
 * reusamos /app/call.answer, mandando un ANSWER con un payload especial
 * ({ rechazada: true }) en vez de una descripcion SDP real. manejarAnswer()
 * del otro lado lo detecta y corta la llamada sin intentar conectar.
 */
function rechazarLlamada() {
    if (ofertaEntrante === null) return;

    stompClient.send('/app/call.answer', {}, JSON.stringify({
        tipo: 'ANSWER',
        emisor: miUsuario,
        destinatario: ofertaEntrante.emisor,
        payload: { rechazada: true }
    }));

    document.getElementById('incomingCall').hidden = true;
    ofertaEntrante = null;
}

/**
 * Procesa la answer que le llega a quien inicio la llamada, ya sea una
 * respuesta real (SDP) o un rechazo ({ rechazada: true }, ver rechazarLlamada).
 */
async function manejarAnswer(senal) {
    if (senal.payload && senal.payload.rechazada) {
        console.log(senal.emisor + ' rechazo la llamada.');
        colgarLlamada();
        return;
    }
    if (peerConnection === null) return;
    await peerConnection.setRemoteDescription(new RTCSessionDescription(senal.payload));
}

/**
 * Agrega un ICE candidate que mando el otro lado a nuestro RTCPeerConnection.
 * Se llama una vez por cada candidate que va llegando (pueden ser varios).
 */
async function manejarIceCandidate(senal) {
    if (peerConnection === null) return;
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(senal.payload));
    } catch (error) {
        console.error('Error agregando ICE candidate:', error);
    }
}

/**
 * Punto de entrada de todo lo que llega por /user/queue/call: segun el
 * "tipo" de la señal, decide que hacer.
 */
function manejarSenalDeLlamada(senal) {
    switch (senal.tipo) {
        case 'OFFER':
            mostrarLlamadaEntrante(senal);
            break;
        case 'ANSWER':
            manejarAnswer(senal);
            break;
        case 'ICE_CANDIDATE':
            manejarIceCandidate(senal);
            break;
        default:
            console.warn('Señal de llamada con tipo desconocido:', senal);
    }
}

/**
 * Corta la llamada actual (si hay una): cierra la conexion WebRTC, apaga
 * camara/microfono y limpia los videos de la pantalla.
 */
function colgarLlamada() {
    if (peerConnection !== null) {
        peerConnection.close();
        peerConnection = null;
    }
    if (localStream !== null) {
        localStream.getTracks().forEach(function (track) {
            track.stop();
        });
        localStream = null;
    }
    document.getElementById('localVideo').srcObject = null;
    document.getElementById('remoteVideo').srcObject = null;
    document.getElementById('btnColgar').hidden = true;
    llamadaConUsuario = null;
}
