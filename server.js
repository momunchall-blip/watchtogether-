const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage
const rooms = {}; // roomId -> { id, name, host, video, state, users, chat, createdAt }
const users = {}; // socketId -> { id, name, roomId, color }

const COLORS = ['#7c5cfc','#e040fb','#00e5ff','#ff5722','#43a047','#ffd600'];

// ─── REST API ─────────────────────────────────────────────────────────────────

// Get all public rooms
app.get('/api/rooms', (req, res) => {
  const list = Object.values(rooms).map(r => ({
    id: r.id,
    name: r.name,
    host: r.host,
    userCount: r.users.length,
    video: r.video ? { title: r.video.title, type: r.video.type } : null,
    createdAt: r.createdAt
  }));
  res.json(list);
});

// Create room
app.post('/api/rooms', (req, res) => {
  const { name, hostName } = req.body;
  if (!name || !hostName) return res.status(400).json({ error: 'name and hostName required' });
  const id = uuidv4().slice(0, 8);
  rooms[id] = {
    id, name,
    host: hostName,
    video: null,
    state: { playing: false, currentTime: 0, updatedAt: Date.now() },
    users: [],
    chat: [],
    createdAt: Date.now()
  };
  res.json({ id });
});

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log('+ connected:', socket.id);

  // Join room
  socket.on('join_room', ({ roomId, userName }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit('error', { message: 'Комната не найдена' });

    const colorIdx = room.users.length % COLORS.length;
    const user = {
      id: socket.id,
      name: userName || 'Гость',
      color: COLORS[colorIdx],
      roomId
    };
    users[socket.id] = user;
    room.users.push(user);

    socket.join(roomId);

    // Send current room state to new user
    socket.emit('room_state', {
      room: {
        id: room.id,
        name: room.name,
        host: room.host,
        video: room.video,
        state: room.state,
        chat: room.chat.slice(-50)
      },
      you: user
    });

    // Notify others
    socket.to(roomId).emit('user_joined', { user, userCount: room.users.length });
    io.to(roomId).emit('users_update', room.users);

    console.log(`${user.name} joined room ${roomId}`);
  });

  // Set video (host sets YouTube URL or title)
  socket.on('set_video', ({ roomId, video }) => {
    const room = rooms[roomId];
    if (!room) return;
    room.video = video; // { type: 'youtube', videoId, title }
    room.state = { playing: false, currentTime: 0, updatedAt: Date.now() };
    io.to(roomId).emit('video_changed', { video, state: room.state });
    console.log(`Video set in room ${roomId}:`, video?.title);
  });

  // Play / Pause sync
  socket.on('player_state', ({ roomId, playing, currentTime }) => {
    const room = rooms[roomId];
    if (!room) return;
    room.state = { playing, currentTime, updatedAt: Date.now() };
    // Broadcast to all EXCEPT sender
    socket.to(roomId).emit('player_state', { playing, currentTime, from: users[socket.id]?.name });
  });

  // Seek sync
  socket.on('player_seek', ({ roomId, currentTime }) => {
    const room = rooms[roomId];
    if (!room) return;
    room.state.currentTime = currentTime;
    room.state.updatedAt = Date.now();
    socket.to(roomId).emit('player_seek', { currentTime, from: users[socket.id]?.name });
  });

  // Chat message
  socket.on('chat_message', ({ roomId, text }) => {
    const room = rooms[roomId];
    const user = users[socket.id];
    if (!room || !user || !text?.trim()) return;

    const msg = {
      id: uuidv4().slice(0, 8),
      userId: socket.id,
      userName: user.name,
      color: user.color,
      text: text.trim().slice(0, 300),
      at: Date.now()
    };
    room.chat.push(msg);
    if (room.chat.length > 200) room.chat.shift();

    io.to(roomId).emit('chat_message', msg);
  });

  // Reaction (emoji burst)
  socket.on('reaction', ({ roomId, emoji }) => {
    socket.to(roomId).emit('reaction', { emoji, from: users[socket.id]?.name });
  });

  // Disconnect
  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (!user) return;
    const room = rooms[user.roomId];
    if (room) {
      room.users = room.users.filter(u => u.id !== socket.id);
      socket.to(user.roomId).emit('user_left', { user, userCount: room.users.length });
      io.to(user.roomId).emit('users_update', room.users);
      // Clean up empty rooms after 10 min
      if (room.users.length === 0) {
        setTimeout(() => { if (rooms[user.roomId]?.users.length === 0) delete rooms[user.roomId]; }, 600000);
      }
    }
    delete users[socket.id];
    console.log(`- disconnected: ${user.name}`);
  });
});

// Fallback to index.html for SPA
app.get('*splat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🎬 WatchTogether running on http://localhost:${PORT}`));
