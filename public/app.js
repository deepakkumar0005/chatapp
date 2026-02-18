// Socket.io connection
const socket = io();

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const app = document.getElementById('app');
const loginBtn = document.getElementById('login-btn');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');

const currentUserAvatar = document.getElementById('current-user-avatar');
const currentUserName = document.getElementById('current-user-name');
const userStatus = document.getElementById('user-status');
const chatsContainer = document.getElementById('chats-container');
const welcomeScreen = document.getElementById('welcome-screen');
const chatContainer = document.getElementById('chat-container');
const chatName = document.getElementById('chat-name');
const chatAvatar = document.getElementById('chat-avatar');
const chatStatus = document.getElementById('chat-status');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

const newChatBtn = document.getElementById('new-chat-btn');
const createGroupBtn = document.getElementById('create-group-btn');
const adminBtn = document.getElementById('admin-btn');
const logoutBtn = document.getElementById('logout-btn');
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.querySelector('.sidebar');

const newChatModal = document.getElementById('new-chat-modal');
const createGroupModal = document.getElementById('create-group-modal');
const adminModal = document.getElementById('admin-modal');
const usersList = document.getElementById('users-list');

const groupNameInput = document.getElementById('group-name');
const createGroupSubmit = document.getElementById('create-group-submit');

const adminPanelLink = document.getElementById('admin-panel-link');

// State
let currentUser = null;
let currentChat = null;
let allUsers = [];
let allChats = [];
let allMessages = {};

// Login
loginBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
        loginError.textContent = 'Please enter both name and password';
        return;
    }

    socket.emit('login', { username, password });
});

// Sign up form handling
const showSignup = document.getElementById('show-signup');
const showLogin = document.getElementById('show-login');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const signupBtn = document.getElementById('signup-btn');
const signupUsername = document.getElementById('signup-username');
const signupPassword = document.getElementById('signup-password');
const signupConfirm = document.getElementById('signup-confirm');
const signupError = document.getElementById('signup-error');
const signupSuccess = document.getElementById('signup-success');

// Switch to signup form
showSignup.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
});

// Switch to login form
showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

// Sign up
signupBtn.addEventListener('click', async () => {
    const username = signupUsername.value.trim();
    const password = signupPassword.value.trim();
    const confirm = signupConfirm.value.trim();

    signupError.textContent = '';
    signupSuccess.textContent = '';

    if (!username || !password || !confirm) {
        signupError.textContent = 'Please fill in all fields';
        return;
    }

    if (password !== confirm) {
        signupError.textContent = 'Passwords do not match';
        return;
    }

    if (password.length < 3) {
        signupError.textContent = 'Password must be at least 3 characters';
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            signupSuccess.textContent = data.message;
            signupUsername.value = '';
            signupPassword.value = '';
            signupConfirm.value = '';
            // Switch to login after successful signup
            setTimeout(() => {
                signupForm.classList.add('hidden');
                loginForm.classList.remove('hidden');
                usernameInput.value = username;
            }, 1500);
        } else {
            signupError.textContent = data.message;
        }
    } catch (err) {
        signupError.textContent = 'Registration failed. Please try again.';
    }
});

socket.on('login-success', (data) => {
    currentUser = data.user;
    allUsers = data.chats.filter(c => c.type === 'private' || c.type === 'group') ? [data.user] : [];
    allChats = data.chats;
    allMessages = data.messages;

    // Update UI
    loginScreen.classList.add('hidden');
    app.classList.remove('hidden');

    currentUserAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
    currentUserName.textContent = currentUser.username;

    if (currentUser.isAdmin) {
        adminPanelLink.classList.remove('hidden');
    }

    // Render chats
    renderChats();
});

socket.on('login-error', (data) => {
    loginError.textContent = data.message;
});

// Render Chats
function renderChats() {
    chatsContainer.innerHTML = '';
    
    allChats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.dataset.chatId = chat.id;

        const lastMessage = allMessages[chat.id]?.slice(-1)[0];
        const lastMessageText = lastMessage ? lastMessage.message : 'No messages yet';
        
        const initial = chat.type === 'group' ? '#' : chat.name.charAt(0).toUpperCase();

        chatItem.innerHTML = `
            <div class="avatar ${chat.type === 'group' ? 'group-avatar' : ''}">
                <span>${initial}</span>
            </div>
            <div class="chat-item-info">
                <h4>${chat.name}</h4>
                <p>${lastMessageText.substring(0, 30)}${lastMessageText.length > 30 ? '...' : ''}</p>
            </div>
        `;

        chatItem.addEventListener('click', () => selectChat(chat));
        chatsContainer.appendChild(chatItem);
    });
}

// Select Chat
function selectChat(chat) {
    currentChat = chat;

    // Update UI
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.chatId === chat.id) {
            item.classList.add('active');
        }
    });

    welcomeScreen.classList.add('hidden');
    chatContainer.classList.remove('hidden');

    chatName.textContent = chat.name;
    chatAvatar.innerHTML = `<span>${chat.type === 'group' ? '#' : chat.name.charAt(0).toUpperCase()}</span>`;
    chatStatus.textContent = chat.type === 'group' ? `${chat.members?.length || 0} members` : 'Online';

    renderMessages();
}

// Render Messages
function renderMessages() {
    if (!currentChat) return;

    const messages = allMessages[currentChat.id] || [];
    messagesContainer.innerHTML = '';

    messages.forEach(msg => {
        addMessageToUI(msg);
    });

    scrollToBottom();
}

function addMessageToUI(msg) {
    const isSent = msg.senderId === currentUser.id;
    const messageEl = document.createElement('div');
    messageEl.className = `message ${isSent ? 'sent' : 'received'}`;
    messageEl.dataset.messageId = msg.id;

    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    messageEl.innerHTML = `
        <div class="message-header">
            <span class="message-sender">${msg.senderName}</span>
            <span class="message-time">${time}</span>
        </div>
        <div class="message-bubble">${msg.message}</div>
    `;

    // Admin can delete messages
    if (currentUser.isAdmin) {
        messageEl.style.cursor = 'pointer';
        messageEl.title = 'Click to delete (Admin only)';
        messageEl.addEventListener('click', () => {
            if (confirm('Delete this message?')) {
                socket.emit('delete-message', {
                    chatId: currentChat.id,
                    messageId: msg.id
                });
            }
        });
    }

    messagesContainer.appendChild(messageEl);
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send Message
function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !currentChat) return;

    socket.emit('send-message', {
        chatId: currentChat.id,
        message: message
    });

    messageInput.value = '';
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Typing indicator
messageInput.addEventListener('input', () => {
    if (currentChat) {
        socket.emit('typing', { chatId: currentChat.id });
    }
});

socket.on('user-typing', (data) => {
    // Show typing indicator (simplified)
});

// New Message
socket.on('new-message', (msg) => {
    if (!allMessages[msg.chatId]) {
        allMessages[msg.chatId] = [];
    }
    allMessages[msg.chatId].push(msg);

    if (currentChat && currentChat.id === msg.chatId) {
        addMessageToUI(msg);
        scrollToBottom();
    }

    // Update chat list
    renderChats();
});

// Message Deleted
socket.on('message-deleted', (data) => {
    if (allMessages[data.chatId]) {
        allMessages[data.chatId] = allMessages[data.chatId].filter(m => m.id !== data.messageId);
    }

    if (currentChat && currentChat.id === data.chatId) {
        renderMessages();
    }
});

// Users Update
socket.on('users-update', (users) => {
    allUsers = users;
});

// Chats Update
socket.on('chats-update', (chats) => {
    allChats = chats;
    renderChats();
});

// New Chat Modal
newChatBtn.addEventListener('click', () => {
    usersList.innerHTML = '';
    
    allUsers.forEach(user => {
        if (user.id === currentUser.id) return;
        
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.innerHTML = `
            <div class="avatar">${user.username.charAt(0).toUpperCase()}</div>
            <div class="user-item-info">
                <h4>${user.username}</h4>
                <span>${user.online ? 'Online' : 'Offline'}</span>
            </div>
        `;
        
        userItem.addEventListener('click', () => {
            socket.emit('create-private-chat', { targetUserId: user.id });
            closeModal(newChatModal);
        });
        
        usersList.appendChild(userItem);
    });
    
    openModal(newChatModal);
});

// Create Group Modal
createGroupBtn.addEventListener('click', () => {
    openModal(createGroupModal);
});

createGroupSubmit.addEventListener('click', () => {
    const name = groupNameInput.value.trim();
    if (!name) return;

    socket.emit('create-group', { name });
    groupNameInput.value = '';
    closeModal(createGroupModal);
});

// Admin Panel
adminBtn.addEventListener('click', () => {
    renderAdminPanel();
    openModal(adminModal);
});

function renderAdminPanel() {
    // Users tab
    const adminUsersList = document.getElementById('admin-users-list');
    adminUsersList.innerHTML = '';
    
    allUsers.forEach(user => {
        const item = document.createElement('div');
        item.className = 'admin-list-item';
        item.innerHTML = `
            <div class="avatar">${user.username.charAt(0).toUpperCase()}</div>
            <div class="admin-list-item-info">
                <h4>${user.username}</h4>
                <span>${user.isAdmin ? '<span class="admin-badge">Admin</span>' : user.online ? 'Online' : 'Offline'}</span>
            </div>
        `;
        adminUsersList.appendChild(item);
    });

    // Groups tab
    const adminGroupsList = document.getElementById('admin-groups-list');
    adminGroupsList.innerHTML = '';
    
    allChats.filter(c => c.type === 'group').forEach(group => {
        const item = document.createElement('div');
        item.className = 'admin-list-item';
        item.innerHTML = `
            <div class="avatar group-avatar">#</div>
            <div class="admin-list-item-info">
                <h4>${group.name}</h4>
                <span>${group.members?.length || 0} members</span>
            </div>
        `;
        adminGroupsList.appendChild(item);
    });
}

// Admin tabs
document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.admin-panel-section').forEach(s => s.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(`admin-${tab.dataset.tab}`).classList.add('active');
    });
});

// Socket events for chat/group creation
socket.on('chat-created', (chat) => {
    allChats.push(chat);
    allMessages[chat.id] = [];
    renderChats();
    selectChat(chat);
});

socket.on('group-created', (group) => {
    allChats.push(group);
    allMessages[group.id] = [];
    renderChats();
    selectChat(group);
});

socket.on('joined-group', (group) => {
    if (!allChats.find(c => c.id === group.id)) {
        allChats.push(group);
    }
    renderChats();
});

// Modal functions
function openModal(modal) {
    modal.classList.remove('hidden');
}

function closeModal(modal) {
    modal.classList.add('hidden');
}

// Close modal on background click
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
    });
});

// Close modal on X button
document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        closeModal(newChatModal);
        closeModal(createGroupModal);
        closeModal(adminModal);
    });
});

// Mobile menu toggle
menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

// Logout
logoutBtn.addEventListener('click', () => {
    location.reload();
});

// User joined/left
socket.on('user-joined', (data) => {
    // Could show notification
});

socket.on('user-left', (data) => {
    // Could show notification
});
