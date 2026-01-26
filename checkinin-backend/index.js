const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// In-memory users store
const users = {};

// Test route
app.get("/", (req, res) => {
  res.send("Checkin’in backend with users running 🚀");
});

// POST /checkin
app.post("/checkin", (req, res) => {
  const { userId, date } = req.body;

  if (!userId || !date) {
    return res.status(400).json({
      success: false,
      message: "userId and date are required",
    });
  }

  // Create user if not exists
  if (!users[userId]) {
    users[userId] = { checkIns: [] };
  }

  if (!users[userId].checkIns.includes(date)) {
    users[userId].checkIns.push(date);
  }

  res.json({
    success: true,
    message: "Checked in successfully",
    data: users[userId].checkIns,
  });
});

// GET /history?userId=xxx
app.get("/history", (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "userId is required",
    });
  }

  if (!users[userId]) {
    return res.json({
      success: true,
      data: [],
    });
  }

  res.json({
    success: true,
    data: users[userId].checkIns,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
