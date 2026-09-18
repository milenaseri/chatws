package org.example.chatws.controller;

import org.example.chatws.entity.ChatMessage;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

/**
 * Recibe los mensajes STOMP que mandan los clientes y los reenvia
 * (broadcast) a todos los usuarios conectados.
 *
 * Los metodos de aca NO se llaman por HTTP normal: se disparan cuando
 * el cliente hace stompClient.send("/app/<ruta>", ...). Spring le saca
 * el prefijo "/app" (definido en WebSocketConfig) y busca el @MessageMapping
 * que matchee con el resto de la ruta.
 */
@Controller
public class ChatController {

    /**
     * Se dispara cuando un cliente manda un mensaje a "/app/chat.sendMessage".
     * Lo que devuelve el metodo se publica automaticamente (gracias a @SendTo)
     * en "/topic/public", y ahi lo reciben TODOS los suscriptos,
     * incluido quien lo mando (por eso el remitente tambien se ve su propio mensaje).
     *
     * Este metodo no cambia aunque el mensaje ahora tenga "destinatario":
     * sigue reenviando el ChatMessage tal cual llego (publico o privado) a
     * /topic/public. Quien decide si se MUESTRA o no un mensaje privado es
     * cada cliente, comparando destinatario contra su propio usuario
     * (ver showMessage() en script.js).
     */
    @MessageMapping ("/chat.sendMessage")
    @SendTo ("/topic/public")
    public ChatMessage enviarMensaje (ChatMessage mensaje){
        System.out.println("Mensaje Recibido en servidor:"
                + mensaje);
        return mensaje;
    }

    /**
     * Se dispara cuando un cliente avisa que se unio al chat
     * (mandando a "/app/chat.addUser"). Tambien se retransmite a
     * "/topic/public" para que el resto vea el aviso de conexion.
     *
     * Ojo: por ahora script.js no llama a esta ruta, asi que el metodo
     * esta listo pero sin usar hasta que se agregue ese llamado del lado del cliente.
     */
    @MessageMapping ("/chat.addUser")
    @SendTo ("/topic/public")
    public ChatMessage agregarUsuario(ChatMessage mensaje){
        return mensaje;
    }

}
