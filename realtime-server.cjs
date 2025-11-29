// realtime-server.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
const server = http.createServer(app);



const io = new Server(server, {
  cors: { origin: "*" }
});

// simple in-memory auctions
const auctions = {
  "1": { highest: { bidderId: null, amount: 0 }, minIncrement: 50, status: "open", purses: {} }
};

// helpers
function roomName(auctionId) { return `auction:${auctionId}`; }

io.on("connection", (socket) => {
  console.log("client connected", socket.id);

  socket.on("join", ({ auctionId, userId }) => {
  console.log("JOIN:", auctionId, userId);

  // SEND INITIAL STATE BACK
  socket.emit("state", {
    auctionId,
    state: {
      highest: null,        
      timer: 15,
      currentPlayer: 1
    }
  });
});


  socket.on("join", ({ auctionId, userId, purse }) => {
    socket.join(roomName(auctionId));
    auctions[auctionId] = auctions[auctionId] || { highest: { bidderId: null, amount: 0 }, minIncrement: 50, status: "open", purses: {} };
    auctions[auctionId].purses[userId] = auctions[auctionId].purses[userId] ?? (purse ?? 10000);
    // send state to joining client
    socket.emit("state", { auctionId, state: auctions[auctionId] });
  });

  socket.on("placeBid", ({ auctionId, bidderId, amount }) => {
    const a = auctions[auctionId];
    if (!a || a.status !== "open") return socket.emit("bidRejected", { reason: "closed or unknown" });
    const min = a.highest.amount + a.minIncrement;
    if (amount < min) return socket.emit("bidRejected", { reason: `min ${min}` });
    const purse = a.purses[bidderId] ?? 0;
    if (amount > purse) return socket.emit("bidRejected", { reason: "insufficient funds" });

    a.highest = { bidderId, amount, ts: Date.now() };
    a.purses[bidderId] = purse - amount;
    io.to(roomName(auctionId)).emit("bidAccepted", { auctionId, highest: a.highest });
  });

  // control events from AuctionControls
  socket.on("sell", ({ auctionId, userId }) => {
    const a = auctions[auctionId];
    if (!a) return;
    a.status = "closed";
    const winner = a.highest;
    io.to(roomName(auctionId)).emit("controlEvent", { type: "sold", auctionId, winner, by: userId });
  });

  socket.on("unsold", ({ auctionId, userId }) => {
    const a = auctions[auctionId];
    if (!a) return;
    a.status = "unsold";
    io.to(roomName(auctionId)).emit("controlEvent", { type: "unsold", auctionId, by: userId });
  });

  socket.on("toggleTimer", ({ auctionId, userId, isTimerRunning }) => {
    io.to(roomName(auctionId)).emit("controlEvent", { type: "toggleTimer", auctionId, by: userId, isTimerRunning });
  });

  socket.on("nextPlayer", ({ auctionId, userId }) => {
    io.to(roomName(auctionId)).emit("controlEvent", { type: "nextPlayer", auctionId, by: userId });
  });

  socket.on("disconnect", () => {
    console.log("client disconnected", socket.id);
  });
});

const path = require('path');

// serve static frontend from dist
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// fallback to index.html for SPA routes — use middleware (no path-to-regexp parsing)
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});



const PORT = process.env.REALTIME_PORT || 4000;
server.listen(PORT, () => console.log("Realtime server listening on", PORT));
