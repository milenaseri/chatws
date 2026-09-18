package org.example.chatws.config;

import java.security.Principal;

/**
 * Implementacion minima de Principal.
 *
 * Para Spring, "quien esta conectado" en una sesion STOMP es simplemente
 * este nombre de usuario: no hay login ni autenticacion real, es solo lo
 * necesario para que SimpMessagingTemplate.convertAndSendToUser(...) sepa
 * a que sesion mandarle un mensaje (lo usa la señalizacion de videollamadas,
 * ver SignalingController). Lo crea CustomHandshakeHandler al conectarse
 * el cliente.
 */
public class StompPrincipal implements Principal {

    private final String name;

    public StompPrincipal(String name) {
        this.name = name;
    }

    @Override
    public String getName() {
        return name;
    }
}
