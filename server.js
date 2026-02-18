// adding mangodatabase satrt
// const mongoose = require("mongoose");

// mongoose.connect(
//   "mongodb+srv://ramsingh1561:%40%4015617379@cluster0.lnoewgy.mongodb.net/chatapp?retryWrites=true&w=majority",
//   {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   }
// )


// MongoDB connect
const mongoose = require("mongoose");

mongoose
  .connect("mongodb+srv://ramsingh1561:%40%4015617379@cluster0.lnoewgy.mongodb.net/chatapp?retryWrites=true&w=majority")
  .then(() => {
    console.log("MongoDB Connected ✅");
  })
  .catch((err) => {
    console.log("Mongo Error ❌", err);
  });

// adding mangodatabase end



// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String,
    isAdmin: Boolean,
    createdAt: { type: Date, default: Date.now }
  });
  
  const User = mongoose.model("User", userSchema);

  // use scheme end
  

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Configuration
const CONFIG = {
    ADMIN_ID: 'admin' // Admin username
};

// In-memory storage
// const registeredUsers = new Map(); // username -> {id, username, password, isAdmin}
const users = new Map(); // socket.id -> user data
const chats = new Map(); // chatId -> chat data
const messages = new Map(); // chatId -> array of messages
const socketToUser = new Map(); // socket.id -> userId

// Create a default group
const defaultGroupId = 'general';
chats.set(defaultGroupId, {
    id: defaultGroupId,
    name: 'General',
    type: 'group',
    members: [],
    createdAt: new Date().toISOString()
});
messages.set(defaultGroupId, []);

// Register new user 
 /*app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.json({ success: false, message: 'Username and password required' });
    }
    
    if (registeredUsers.has(username.toLowerCase())) {
        return res.json({ success: false, message: 'Username already exists' });
    }
    
    const isAdmin = username.toLowerCase() === CONFIG.ADMIN_ID;
    const newUser = {
        id: uuidv4(),
        username: username,
        password: password, // In production, hash this!
        isAdmin: isAdmin,
        createdAt: new Date().toISOString()
    };
    
    registeredUsers.set(username.toLowerCase(), newUser);
    res.json({ success: true, message: 'Registration successful! Please login.' });
}); */


// Register new user (MongoDB)
app.post('/api/register', async (req, res) => {
    try {
      let { username, password } = req.body;
  
      if (!username || !password) {
        return res.json({
          success: false,
          message: "Username and password required"
        });
      }
  
      username = username.toLowerCase();
  
      // Check user already exists
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.json({
          success: false,
          message: "Username already exists"
        });
      }
  
      const isAdmin = username === CONFIG.ADMIN_ID;
  
      // Create user in MongoDB
      const newUser = new User({
        // id: uuidv4(),
        username,
        password, // (Next step me hash karenge)
        isAdmin
      });
  
      await newUser.save();
  
      res.json({
        success: true,
        message: "Registration successful! Please login."
      });
  
    } catch (err) {
      console.log(err);
      res.json({
        success: false,
        message: "Server error"
      });
    }
  });
  

// Check if username exists
// get old  app.get('/api/check-username/:username', (req, res) => {
    //const exists = registeredUsers.has(req.params.username.toLowerCase());
    //res.json({ exists });
 //}); //


// Check if username exists (MongoDB)
app.get('/api/check-username/:username', async (req, res) => {
    try {
      const user = await User.findOne({
        username: req.params.username.toLowerCase()
      });
  
      res.json({ exists: !!user }); // true / false
  
    } catch (err) {
      console.log(err);
      res.json({ exists: false });
    }
  });
  

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // // Login with individual password
    // socket.on('login', (data) => {
    //     const { username, password } = data;
        
    //     const userRecord = registeredUsers.get(username.toLowerCase());
        
    //     if (!userRecord) {
    //         socket.emit('login-error', { message: 'User not found. Please sign up first.' });
    //         return;
    //     }
        
    //     if (userRecord.password !== password) {
    //         socket.emit('login-error', { message: 'Invalid password' });
    //         return;
    //     }

    //     const user = {
    //         id: userRecord.id,
    //         username: userRecord.username,
    //         isAdmin: userRecord.isAdmin,
    //         socketId: socket.id,
    //         online: true
    //     };

    //     users.set(socket.id, user);
    //     socketToUser.set(socket.id, user.id);

    //     // Add user to default group
    //     const defaultChat = chats.get(defaultGroupId);
    //     if (!defaultChat.members.includes(user.id)) {
    //         defaultChat.members.push(user.id);
    //     }

    //     socket.emit('login-success', { 
    //         user: user,
    //         chats: Array.from(chats.values()),
    //         messages: Object.fromEntries(messages)
    //     });

    //     // Notify others
    //     socket.broadcast.emit('user-joined', { user });
    //     io.emit('users-update', Array.from(users.values()));
    // });




    // Login using MongoDB
socket.on('login', async (data) => {
    try {
        let { username, password } = data;
        username = username.toLowerCase();

        const userRecord = await User.findOne({ username });

        if (!userRecord) {
            socket.emit('login-error', { message: 'User not found. Please sign up first.' });
            return;
        }

        if (userRecord.password !== password) {
            socket.emit('login-error', { message: 'Invalid password' });
            return;
        }

        const user = {
            id: userRecord._id.toString(),
            username: userRecord.username,
            isAdmin: userRecord.isAdmin,
            socketId: socket.id,
            online: true
        };

        users.set(socket.id, user);
        socketToUser.set(socket.id, user.id);

        const defaultChat = chats.get(defaultGroupId);
        if (!defaultChat.members.includes(user.id)) {
            defaultChat.members.push(user.id);
        }

        socket.emit('login-success', { 
            user: user,
            chats: Array.from(chats.values()),
            messages: Object.fromEntries(messages)
        });

        socket.broadcast.emit('user-joined', { user });
        io.emit('users-update', Array.from(users.values()));

    } catch (err) {
        console.log(err);
        socket.emit('login-error', { message: 'Server error' });
    }
});


    // Get all users
    socket.on('get-users', () => {
        socket.emit('users-update', Array.from(users.values()));
    });

    // Get all chats
    socket.on('get-chats', () => {
        socket.emit('chats-update', Array.from(chats.values()));
    });

    // Create or get 1-on-1 chat
    socket.on('create-private-chat', (data) => {
        const { targetUserId } = data;
        const currentUser = users.get(socket.id);
        
        if (!currentUser) return;

        // Check if private chat already exists
        let privateChat = null;
        for (const [chatId, chat] of chats) {
            if (chat.type === 'private' && 
                chat.members.includes(currentUser.id) && 
                chat.members.includes(targetUserId)) {
                privateChat = chat;
                break;
            }
        }

        if (!privateChat) {
            const targetUser = Array.from(users.values()).find(u => u.id === targetUserId);
            privateChat = {
                id: uuidv4(),
                name: targetUser ? targetUser.username : 'Unknown',
                type: 'private',
                members: [currentUser.id, targetUserId],
                createdAt: new Date().toISOString()
            };
            chats.set(privateChat.id, privateChat);
            messages.set(privateChat.id, []);
        }

        io.emit('chats-update', Array.from(chats.values()));
        socket.emit('chat-created', privateChat);
    });

    // Create group
    socket.on('create-group', (data) => {
        const { name } = data;
        const currentUser = users.get(socket.id);
        
        if (!currentUser) return;

        const group = {
            id: uuidv4(),
            name: name,
            type: 'group',
            members: [currentUser.id],
            admin: currentUser.id,
            createdAt: new Date().toISOString()
        };

        chats.set(group.id, group);
        messages.set(group.id, []);

        io.emit('chats-update', Array.from(chats.values()));
        socket.emit('group-created', group);
    });

    // Join group
    socket.on('join-group', (data) => {
        const { chatId } = data;
        const currentUser = users.get(socket.id);
        
        if (!currentUser) return;

        const chat = chats.get(chatId);
        if (chat && !chat.members.includes(currentUser.id)) {
            chat.members.push(currentUser.id);
            io.emit('chats-update', Array.from(chats.values()));
            socket.emit('joined-group', chat);
        }
    });

    // Send message
    socket.on('send-message', (data) => {
        const { chatId, message } = data;
        const currentUser = users.get(socket.id);
        
        if (!currentUser) return;

        const chatMessages = messages.get(chatId) || [];
        const messageData = {
            id: uuidv4(),
            chatId: chatId,
            senderId: currentUser.id,
            senderName: currentUser.username,
            message: message,
            timestamp: new Date().toISOString()
        };

        chatMessages.push(messageData);
        messages.set(chatId, chatMessages);

        io.emit('new-message', messageData);
    });

    // Delete message (admin only)
    socket.on('delete-message', (data) => {
        const { chatId, messageId } = data;
        const currentUser = users.get(socket.id);
        
        if (!currentUser || !currentUser.isAdmin) return;

        const chatMessages = messages.get(chatId) || [];
        const updatedMessages = chatMessages.filter(m => m.id !== messageId);
        messages.set(chatId, updatedMessages);

        io.emit('message-deleted', { chatId, messageId });
    });

    // Typing indicator
    socket.on('typing', (data) => {
        const { chatId } = data;
        const currentUser = users.get(socket.id);
        
        if (!currentUser) return;

        socket.to(chatId).emit('user-typing', {
            chatId: chatId,
            user: currentUser
        });
    });

    // Disconnect
    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            user.online = false;
            users.set(socket.id, user);
            socketToUser.delete(socket.id);
            io.emit('users-update', Array.from(users.values()));
            io.emit('user-left', { userId: user.id });
        }
        console.log('User disconnected:', socket.id);
    });
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Admin ID: ${CONFIG.ADMIN_ID}`);
});







// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => {
//     console.log(`ChatApp server running on http://localhost:${PORT}`);
//     // console.log(`Password: ${CONFIG.CHAT_PASSWORD}`);
//     console.log(`Admin ID: ${CONFIG.ADMIN_ID}`);
// });

