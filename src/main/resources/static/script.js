let stompClient = null;

function connect() {
    const serverIp = document.getElementById('serverIp').value;
    const username = document.getElementById('username').value;
    // Acepta "ip" (usa el puerto 8080) o "ip:puerto" para conectarse a otra instancia del servidor
    const host = serverIp.includes(':') ? serverIp : serverIp + ':8080';
    const socket = new SockJS('http://' + host + '/chat');
    stompClient = Stomp.over(socket);
    
    stompClient.connect({}, function (frame) {
        setConnected(true);
        console.log('Connected: ' + frame);
        stompClient.subscribe('/topic/public', function (message) {
            showMessage(JSON.parse(message.body));
        });
        stompClient.subscribe('/queue/' + username, function (message) {
            showMessage(JSON.parse(message.body));
        });
    }, function (error) {
        console.error('Error: ' + error);
        setConnected(false);
    });
}

function disconnect() {
    if (stompClient !== null) {
        stompClient.disconnect();
    }
    setConnected(false);
    console.log("Disconnected");
}

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

function toggleMessageType() {
    const messageType = document.querySelector('input[name="messageType"]:checked').value;
    const recipientContainer = document.getElementById('recipientContainer');
    if (messageType === 'private') {
        recipientContainer.style.display = 'block';
        switchTab('private');
    } else {
        recipientContainer.style.display = 'none';
        switchTab('public');
    }
}

function switchTab(tab) {
    const publicTab = document.querySelector('.tab-button:nth-child(1)');
    const privateTab = document.querySelector('.tab-button:nth-child(2)');
    const publicMessages = document.getElementById('publicMessages');
    const privateMessages = document.getElementById('privateMessages');
    
    if (tab === 'public') {
        publicTab.classList.add('active');
        privateTab.classList.remove('active');
        publicMessages.classList.add('active');
        privateMessages.classList.remove('active');
        document.querySelector('input[name="messageType"][value="public"]').checked = true;
        document.getElementById('recipientContainer').style.display = 'none';
    } else {
        privateTab.classList.add('active');
        publicTab.classList.remove('active');
        privateMessages.classList.add('active');
        publicMessages.classList.remove('active');
        document.querySelector('input[name="messageType"][value="private"]').checked = true;
        document.getElementById('recipientContainer').style.display = 'block';
    }
}

function sendMessage() {
    const username = document.getElementById('username').value;
    const content = document.getElementById('message').value;
    const messageType = document.querySelector('input[name="messageType"]:checked').value;
    
    if (content.trim() === '') return;
    
    if (messageType === 'private') {
        const recipient = document.getElementById('recipient').value;
        if (recipient.trim() === '') {
            alert('Por favor ingresa un destinatario para el mensaje privado');
            return;
        }
        stompClient.send("/app/chat.sendPrivate", {}, JSON.stringify({
            tipo: 'CHAT',
            usuario: username,
            contenido: content,
            destinatario: recipient
        }));
    } else {
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify({
            tipo: 'CHAT',
            usuario: username,
            contenido: content,
            destinatario: null
        }));
    }
    
    document.getElementById('message').value = '';
}

function showMessage(message) {
    const messages = message.destinatario ? document.getElementById('privateMessages') : document.getElementById('publicMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.innerHTML = '<strong>' + message.usuario + ':</strong> ' + message.contenido;
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
}

// Allow sending message with Enter key
document.getElementById('message').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
