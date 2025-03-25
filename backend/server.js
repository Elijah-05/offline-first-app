const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const morgan = require("morgan");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Morgan Logger Middleware (logs incoming requests)
app.use(morgan("common")); // Use 'combined' format for detailed logs

// In-memory database
let tasks = [
  { id: uuidv4(), title: "Learn offline-first patterns", completed: false },
  { id: uuidv4(), title: "Implement service worker", completed: false },
  { id: uuidv4(), title: "Test offline capabilities", completed: false },
];

// Routes
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/api", (req, res) => {
  res.send("Hello World!");
});

app.get("/api/tasks", (req, res) => {
  setTimeout(() => {
    res.json(tasks);
  }, 500);
});

app.post("/api/tasks", (req, res) => {
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  const newTask = {
    id: uuidv4(),
    title,
    completed: false,
  };

  tasks.push(newTask);
  res.status(201).json(newTask);
});

app.put("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const { title, completed } = req.body;

  const taskIndex = tasks.findIndex((task) => task.id === id);
  if (taskIndex === -1) {
    return res.status(404).json({ error: "Task not found" });
  }

  if (title !== undefined) tasks[taskIndex].title = title;
  if (completed !== undefined) tasks[taskIndex].completed = completed;

  res.json(tasks[taskIndex]);
});

app.delete("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  tasks = tasks.filter((task) => task.id !== id);
  res.status(204).send();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
