package org.example.chatws.controller;

import org.example.chatws.entity.CallSignal;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

/**
 * Controller de señalizacion para las videollamadas WebRTC (audio/video
 * entre dos usuarios). Es un controller APARTE de ChatController a
 * proposito: la videollamada es una funcionalidad en paralelo al chat de
 * texto, no depende de /chat.sendMessage ni de /topic/public, y no los toca.
 *
 * A diferencia del chat publico (que usa @SendTo "/topic/public", o sea
 * "mandaselo a TODOS los suscriptos"), aca usamos
 * SimpMessagingTemplate.convertAndSendToUser(...) para mandarle el mensaje
 * SOLO al usuario "destinatario" de la señal. Esto necesita que cada
 * conexion tenga un Principal asignado (ver CustomHandshakeHandler en
 * WebSocketConfig); convertAndSendToUser(destinatario, "/queue/call", senal)
 * termina mandando el mensaje al destino interno "/user/{destinatario}/queue/call",
 * y solo la sesion de ese usuario esta suscripta ahi.
 *
 * WebRTC en si (audio/video) NO pasa por aca ni por el servidor: esto es
 * solo el "cartero" que reenvia los mensajes de coordinacion (SDP e ICE
 * candidates) para que los dos navegadores puedan armar la conexion
 * peer-to-peer directa entre ellos.
 */
@Controller
public class SignalingController {

    private final SimpMessagingTemplate messagingTemplate;

    public SignalingController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Un usuario quiere iniciar una llamada: manda su oferta SDP (offer).
     * Se la reenviamos solo al destinatario elegido.
     */
    @MessageMapping("/call.offer")
    public void recibirOffer(CallSignal senal) {
        messagingTemplate.convertAndSendToUser(senal.destinatario(), "/queue/call", senal);
    }

    /**
     * El que recibio la offer contesta con su answer SDP (o la rechaza:
     * ver el comentario en script.js sobre el payload {rechazada: true},
     * que reusa este mismo endpoint para avisar el rechazo). Se la
     * reenviamos solo a quien inicio la llamada.
     */
    @MessageMapping("/call.answer")
    public void recibirAnswer(CallSignal senal) {
        messagingTemplate.convertAndSendToUser(senal.destinatario(), "/queue/call", senal);
    }

    /**
     * Cada ICE candidate que va generando el navegador (de cualquiera de
     * los dos lados, a medida que los va descubriendo) se reenvia tal cual
     * al otro usuario de la llamada.
     */
    @MessageMapping("/call.ice")
    public void recibirIceCandidate(CallSignal senal) {
        messagingTemplate.convertAndSendToUser(senal.destinatario(), "/queue/call", senal);
    }
}
