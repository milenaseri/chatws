package org.example.chatws.config;

import org.example.chatws.utility.Constants;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Configuración de WebSocket para habilitar mensajería en tiempo real.
 * Esta clase configura el broker de mensajes y los endpoints de conexión WebSocket.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    // Prefijo para los destinos de tipo topic (suscripciones)
    public static final String TOPIC = "/topic";
    // Prefijo para los destinos de la aplicación (mensajes enviados por clientes)
    public static final String APP = "/app";
    // Prefijo para los destinos de tipo queue (mensajes privados)
    public static final String QUEUE = "/queue";

    // Datos de conexión a RabbitMQ (ver application.yaml)
    @Value("${spring.rabbitmq.host}")
    private String relayHost;
    @Value("${chat.rabbitmq.stomp-port}")
    private int relayPort;
    @Value("${spring.rabbitmq.username}")
    private String relayUsername;
    @Value("${spring.rabbitmq.password}")
    private String relayPassword;

    /**
     * Configura el broker de mensajes.
     * - enableStompBrokerRelay: En lugar del broker en memoria (enableSimpleBroker), reenvía
     *   los mensajes de /topic (broadcast) y /queue (privado) a RabbitMQ a través de su plugin STOMP.
     *   Así varias instancias de la app comparten los mensajes y RabbitMQ los guarda si el servidor se cae.
     *   En RabbitMQ, /topic/public se publica en el exchange amq.topic con routing key "public"
     *   y /queue/{destinatario} es una cola con ese nombre.
     * - setClientLogin/setSystemLogin: Credenciales para las conexiones de los clientes y para
     *   la conexión compartida que usa el servidor para enviar mensajes (SimpMessagingTemplate).
     * - setApplicationDestinationPrefixes: Define el prefijo para destinos de mensajes
     *   enviados desde el cliente al servidor (ej: /app/chat.sendMessage).
     *
     * @param config Registro de configuración del broker de mensajes
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableStompBrokerRelay(TOPIC, QUEUE)
                .setRelayHost(relayHost)
                .setRelayPort(relayPort)
                .setClientLogin(relayUsername)
                .setClientPasscode(relayPassword)
                .setSystemLogin(relayUsername)
                .setSystemPasscode(relayPassword);
        config.setApplicationDestinationPrefixes(APP);
    }

    /**
     * Registra los endpoints STOMP para la conexión WebSocket.
     * - addEndpoint: Define la URL donde los clientes se conectarán al WebSocket.
     * - withSockJS: Habilita SockJS como fallback para navegadores que no soportan WebSocket nativo.
     *   Esto permite conexiones via HTTP long-polling si WebSocket no está disponible.
     * 
     * @param registry Registro de endpoints STOMP
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint(Constants.ENDPOINT).withSockJS();
    }
}
