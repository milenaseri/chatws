package org.example.chatws.entity;

/**
 * Mensaje de señalizacion WebRTC (NO es un mensaje de chat, es otra cosa
 * en paralelo). Viaja por los endpoints /app/call.offer, /app/call.answer
 * y /app/call.ice, y el servidor lo reenvia SOLO al "destinatario" (con
 * convertAndSendToUser), no a todos los conectados como el chat publico.
 *
 * Campos:
 * - tipo: "OFFER", "ANSWER" o "ICE_CANDIDATE" (que tipo de dato WebRTC trae).
 * - emisor: quien lo manda.
 * - destinatario: a quien va dirigido (el otro usuario de la llamada).
 * - payload: el contenido en si, distinto segun el tipo:
 *   - OFFER/ANSWER: la descripcion de sesion SDP que devuelve
 *     RTCPeerConnection.createOffer()/createAnswer() (un objeto {type, sdp}).
 *   - ICE_CANDIDATE: el objeto RTCIceCandidate generado en el evento
 *     onicecandidate del navegador.
 *   Se deja como Object (no String) para que Jackson lo serialice directo
 *   como JSON anidado, sin tener que armar/parsear un string aparte.
 */
public record CallSignal(String tipo, String emisor, String destinatario, Object payload) {
}
