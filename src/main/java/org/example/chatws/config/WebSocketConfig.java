package org.example.chatws.config;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;

/**
 * Configuracion del WebSocket + STOMP del chat.
 *
 * Spring necesita saber dos cosas para que esto funcione:
 * 1) Por donde entran los clientes (el endpoint al que se conecta el navegador).
 * 2) Como se enrutan los mensajes una vez adentro (el broker de mensajeria).
 */
@Configuration
@EnableWebSocketMessageBroker // habilita el uso de STOMP sobre WebSocket en la app
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    /**
     * Define los "canales" (destinos) que va a usar la mensajeria:
     * - "/topic": broker simple en memoria. Todo lo que se publica en un destino
     *   que arranca con /topic se reenvia (broadcast) a todos los suscriptos.
     *   Ej: /topic/public es el canal donde todos los usuarios reciben los mensajes.
     * - "/queue": tambien lo maneja el broker simple, pero se usa para mensajes
     *   PUNTO A PUNTO (a un usuario especifico), no para broadcast. La agregamos
     *   para la señalizacion de las videollamadas WebRTC (ver SignalingController),
     *   que manda cada mensaje con SimpMessagingTemplate.convertAndSendToUser(...)
     *   en vez de @SendTo. El chat de texto no la usa, sigue igual que antes.
     * - "/app": prefijo para los mensajes que el CLIENTE manda al SERVIDOR.
     *   Cuando el JS hace stompClient.send("/app/chat.sendMessage", ...), Spring
     *   le sacar el prefijo "/app" y busca un @MessageMapping("/chat.sendMessage")
     *   en algun @Controller (ver ChatController).
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
        // "/user" es el valor por defecto; lo dejamos explicito porque es lo que
        // hace que convertAndSendToUser(destinatario, "/queue/call", ...) termine
        // resolviendose, internamente, a "/user/{destinatario}/queue/call".
        config.setUserDestinationPrefix("/user");
    }

    /**
     * Registra el endpoint al que se conecta el navegador
     * (new SockJS("http://.../<endpoint>") en script.js).
     *
     * IMPORTANTE: el path que se pone aca tiene que ser EXACTAMENTE el mismo
     * que usa script.js, sino la conexion nunca se establece (SockJS da 404).
     *
     * .withSockJS() agrega un "fallback": si el navegador no soporta WebSocket
     * nativo, SockJS simula la conexion con otras tecnicas (polling, etc.).
     *
     * .setHandshakeHandler(new CustomHandshakeHandler()) es nuevo: le asigna un
     * Principal (usuario) a cada conexion, que es lo que necesita
     * convertAndSendToUser(...) para saber a que sesion mandarle un mensaje
     * privado (usado por la señalizacion de videollamadas). El chat de texto
     * no depende de esto para nada, sigue funcionando igual.
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/chat")
                .setHandshakeHandler(new CustomHandshakeHandler())
                .withSockJS();
    }
}