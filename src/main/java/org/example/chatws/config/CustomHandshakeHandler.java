package org.example.chatws.config;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.Map;
import java.util.UUID;

/**
 * Handshake handler que le asigna un Principal (basicamente, "quien es" el
 * usuario) a cada conexion WebSocket, leyendo el query param "username" que
 * manda script.js al conectarse (ej: new SockJS(".../chat?username=Ana")).
 *
 * Esto es lo que le permite despues al backend mandarle un mensaje a UN
 * usuario puntual (SimpMessagingTemplate.convertAndSendToUser(...)) en vez
 * de a todos los conectados. Lo necesita la señalizacion de las
 * videollamadas (ver SignalingController); el chat de texto no lo usa,
 * sigue haciendo broadcast normal a /topic/public.
 */
public class CustomHandshakeHandler extends DefaultHandshakeHandler {

    @Override
    protected Principal determineUser(ServerHttpRequest request, WebSocketHandler wsHandler, Map<String, Object> attributes) {
        String query = request.getURI().getQuery(); // algo como "username=Ana"
        String username = null;

        if (query != null) {
            for (String param : query.split("&")) {
                String[] partes = param.split("=", 2);
                if (partes.length == 2 && partes[0].equals("username")) {
                    username = URLDecoder.decode(partes[1], StandardCharsets.UTF_8);
                }
            }
        }

        if (username == null || username.isBlank()) {
            // Fallback por si alguien se conecta sin mandar username: le
            // damos un nombre unico para que no rompa la conexion, pero
            // no va a poder recibir llamadas dirigidas a un nombre real.
            username = "anonimo-" + UUID.randomUUID();
        }

        return new StompPrincipal(username);
    }
}
