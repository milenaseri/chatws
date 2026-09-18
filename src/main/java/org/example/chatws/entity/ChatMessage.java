package org.example.chatws.entity;

/**
 * Representa un mensaje del chat. Al ser un "record", Java genera solo
 * el constructor, los getters (tipo(), usuario(), contenido(), destinatario())
 * y equals/hashCode/toString.
 *
 * Jackson (la libreria que serializa/deserializa JSON) lo convierte directo
 * desde/hacia un JSON como:
 * { "tipo": "CHAT", "usuario": "Ana", "contenido": "Hola!", "destinatario": "TODOS" }
 *
 * Campos:
 * - tipo: tipo de evento del mensaje. Por convencion "CHAT" es un mensaje
 *   normal; podria usarse "JOIN"/"LEAVE" para avisos de conexion/desconexion.
 * - usuario: nombre de quien escribe (el remitente).
 * - contenido: el texto del mensaje.
 * - destinatario: a quien va dirigido el mensaje. Si vale "TODOS" es un
 *   mensaje publico (lo ve cualquiera en el chat); si trae un nombre de
 *   usuario puntual, es un mensaje privado dirigido solo a esa persona.
 *
 *   Importante: el servidor sigue mandando TODOS los mensajes por el mismo
 *   canal /topic/public (no hay una cola real por usuario todavia). La
 *   privacidad se resuelve del lado del cliente: cada navegador filtra y
 *   solo MUESTRA el mensaje si el destinatario es "TODOS" o coincide con
 *   su propio usuario (ver showMessage() en script.js).
 */
public record ChatMessage (String tipo, String usuario, String contenido, String destinatario){


}
