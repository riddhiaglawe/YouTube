// Real-time Video Call Signaling & Room Manager
const rooms = new Map();

export function setupMeetingSocket(io) {
  io.on("connection", (socket) => {
    console.log(`[Socket] User connected: ${socket.id}`);

    // Join meeting room
    socket.on("join-room", ({ roomId, user, passcode }) => {
      const room = rooms.get(roomId);

      if (!room) {
        // Create room if it doesn't exist
        const newRoom = {
          id: roomId,
          hostSocketId: socket.id,
          hostUserId: user.id || socket.id,
          passcode: passcode || "",
          isLocked: false,
          maxParticipants: 50,
          permissions: {
            allowScreenShare: true,
            allowChat: true,
          },
          participants: new Map(),
          chatMessages: [],
          createdAt: Date.now(),
        };

        const participant = {
          socketId: socket.id,
          userId: user.id || socket.id,
          name: user.name || "Guest User",
          avatar: user.avatar || user.image || "",
          isHost: true,
          isCohost: false,
          isMuted: false,
          isCameraOff: false,
          isHandRaised: false,
          isSpeaking: false,
        };

        newRoom.participants.set(socket.id, participant);
        rooms.set(roomId, newRoom);

        socket.join(roomId);
        socket.roomId = roomId;

        socket.emit("room-joined", {
          roomId,
          isHost: true,
          isCohost: false,
          roomState: serializeRoom(newRoom),
        });

        console.log(`[Room ${roomId}] Created by host ${participant.name} (${socket.id})`);
        return;
      }

      // Check room lock
      if (room.isLocked) {
        return socket.emit("join-error", { message: "This room is locked by the host." });
      }

      // Check passcode if room has passcode
      if (room.passcode && room.passcode !== passcode) {
        return socket.emit("join-error", { message: "Invalid room passcode." });
      }

      // Check participant limit
      if (room.participants.size >= room.maxParticipants) {
        return socket.emit("join-error", { message: "Room is full (maximum capacity reached)." });
      }

      const participant = {
        socketId: socket.id,
        userId: user.id || socket.id,
        name: user.name || "Guest User",
        avatar: user.avatar || user.image || "",
        isHost: room.hostSocketId === socket.id,
        isCohost: false,
        isMuted: false,
        isCameraOff: false,
        isHandRaised: false,
        isSpeaking: false,
      };

      room.participants.set(socket.id, participant);
      socket.join(roomId);
      socket.roomId = roomId;

      // Send current state to newly joined user
      socket.emit("room-joined", {
        roomId,
        isHost: participant.isHost,
        isCohost: participant.isCohost,
        roomState: serializeRoom(room),
      });

      // Broadcast to existing room members that a new user joined
      socket.to(roomId).emit("user-joined", { participant });

      console.log(`[Room ${roomId}] User ${participant.name} (${socket.id}) joined. Total: ${room.participants.size}`);
    });

    // WebRTC Signaling
    socket.on("signal-offer", ({ targetSocketId, offer }) => {
      io.to(targetSocketId).emit("signal-offer", {
        senderSocketId: socket.id,
        offer,
      });
    });

    socket.on("signal-answer", ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit("signal-answer", {
        senderSocketId: socket.id,
        answer,
      });
    });

    socket.on("signal-ice-candidate", ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit("signal-ice-candidate", {
        senderSocketId: socket.id,
        candidate,
      });
    });

    // Participant State Changes (Mic, Camera, Hand raise, Speaking)
    socket.on("update-state", (updates) => {
      const roomId = socket.roomId;
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;

      const participant = room.participants.get(socket.id);
      if (participant) {
        Object.assign(participant, updates);
        io.in(roomId).emit("user-state-changed", {
          socketId: socket.id,
          updates,
        });
      }
    });

    // In-Call Chat Message
    socket.on("send-message", ({ message }) => {
      const roomId = socket.roomId;
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;

      if (!room.permissions.allowChat) {
        const p = room.participants.get(socket.id);
        if (p && !p.isHost && !p.isCohost) {
          return socket.emit("error-message", { message: "Chat is disabled by the host." });
        }
      }

      const sender = room.participants.get(socket.id);
      const chatMsg = {
        id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        senderSocketId: socket.id,
        senderName: sender?.name || "Participant",
        senderAvatar: sender?.avatar || "",
        text: message.text || "",
        emoji: message.emoji || null,
        file: message.file || null,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      room.chatMessages.push(chatMsg);
      if (room.chatMessages.length > 200) room.chatMessages.shift(); // keep last 200

      io.in(roomId).emit("new-chat-message", { chatMsg });
    });

    // Host Moderation Controls
    socket.on("mute-participant", ({ targetSocketId }) => {
      const roomId = socket.roomId;
      const room = rooms.get(roomId);
      if (!room) return;

      const caller = room.participants.get(socket.id);
      if (!caller?.isHost && !caller?.isCohost) return;

      const target = room.participants.get(targetSocketId);
      if (target) {
        target.isMuted = true;
        io.to(targetSocketId).emit("force-muted", { by: caller.name });
        io.in(roomId).emit("user-state-changed", {
          socketId: targetSocketId,
          updates: { isMuted: true },
        });
      }
    });

    socket.on("mute-all", () => {
      const roomId = socket.roomId;
      const room = rooms.get(roomId);
      if (!room) return;

      const caller = room.participants.get(socket.id);
      if (!caller?.isHost && !caller?.isCohost) return;

      room.participants.forEach((p, sId) => {
        if (!p.isHost && !p.isCohost) {
          p.isMuted = true;
          io.to(sId).emit("force-muted", { by: caller.name });
          io.in(roomId).emit("user-state-changed", {
            socketId: sId,
            updates: { isMuted: true },
          });
        }
      });
    });

    socket.on("remove-participant", ({ targetSocketId }) => {
      const roomId = socket.roomId;
      const room = rooms.get(roomId);
      if (!room) return;

      const caller = room.participants.get(socket.id);
      if (!caller?.isHost && !caller?.isCohost) return;

      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.emit("kicked-from-meeting", { reason: "Removed by host." });
        targetSocket.leave(roomId);
        targetSocket.roomId = null;
      }

      room.participants.delete(targetSocketId);
      io.in(roomId).emit("user-left", { socketId: targetSocketId, reason: "kicked" });
    });

    socket.on("toggle-lock", ({ isLocked }) => {
      const roomId = socket.roomId;
      const room = rooms.get(roomId);
      if (!room) return;

      const caller = room.participants.get(socket.id);
      if (!caller?.isHost && !caller?.isCohost) return;

      room.isLocked = !!isLocked;
      io.in(roomId).emit("room-lock-changed", { isLocked: room.isLocked, by: caller.name });
    });

    socket.on("toggle-cohost", ({ targetSocketId, isCohost }) => {
      const roomId = socket.roomId;
      const room = rooms.get(roomId);
      if (!room) return;

      const caller = room.participants.get(socket.id);
      if (!caller?.isHost) return; // Only main host can assign co-hosts

      const target = room.participants.get(targetSocketId);
      if (target) {
        target.isCohost = !!isCohost;
        io.to(targetSocketId).emit("cohost-status-changed", { isCohost: target.isCohost });
        io.in(roomId).emit("user-state-changed", {
          socketId: targetSocketId,
          updates: { isCohost: target.isCohost },
        });
      }
    });

    socket.on("update-permissions", ({ permissions }) => {
      const roomId = socket.roomId;
      const room = rooms.get(roomId);
      if (!room) return;

      const caller = room.participants.get(socket.id);
      if (!caller?.isHost && !caller?.isCohost) return;

      room.permissions = { ...room.permissions, ...permissions };
      io.in(roomId).emit("permissions-changed", { permissions: room.permissions });
    });

    socket.on("end-meeting-for-all", () => {
      const roomId = socket.roomId;
      const room = rooms.get(roomId);
      if (!room) return;

      const caller = room.participants.get(socket.id);
      if (!caller?.isHost) return;

      io.in(roomId).emit("meeting-ended", { reason: "The host ended the meeting for everyone." });
      rooms.delete(roomId);
    });

    // Leave room
    socket.on("leave-room", () => {
      handleUserDisconnect(socket, io);
    });

    // Disconnect event
    socket.on("disconnect", () => {
      console.log(`[Socket] User disconnected: ${socket.id}`);
      handleUserDisconnect(socket, io);
    });
  });
}

function handleUserDisconnect(socket, io) {
  const roomId = socket.roomId;
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room) return;

  const participant = room.participants.get(socket.id);
  room.participants.delete(socket.id);
  socket.leave(roomId);
  socket.roomId = null;

  io.in(roomId).emit("user-left", { socketId: socket.id, name: participant?.name });

  // If host leaves and room still has users, promote first participant or cohost
  if (room.participants.size > 0) {
    if (room.hostSocketId === socket.id) {
      let nextHostSocketId = Array.from(room.participants.keys())[0];
      // check if any cohost exists
      for (const [sId, p] of room.participants.entries()) {
        if (p.isCohost) {
          nextHostSocketId = sId;
          break;
        }
      }
      const newHost = room.participants.get(nextHostSocketId);
      if (newHost) {
        room.hostSocketId = nextHostSocketId;
        newHost.isHost = true;
        io.to(nextHostSocketId).emit("promoted-to-host");
        io.in(roomId).emit("host-changed", { newHostSocketId: nextHostSocketId, name: newHost.name });
      }
    }
  } else {
    // Empty room, clean up after 2 minutes
    setTimeout(() => {
      const checkRoom = rooms.get(roomId);
      if (checkRoom && checkRoom.participants.size === 0) {
        rooms.delete(roomId);
        console.log(`[Room ${roomId}] Cleaned up empty room.`);
      }
    }, 120000);
  }
}

function serializeRoom(room) {
  return {
    id: room.id,
    isLocked: room.isLocked,
    maxParticipants: room.maxParticipants,
    permissions: room.permissions,
    participants: Array.from(room.participants.values()),
    chatMessages: room.chatMessages,
  };
}
