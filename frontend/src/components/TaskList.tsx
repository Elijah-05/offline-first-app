/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from "react";
import offlineApi from "../api/offlineApi";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import axios from "axios";

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

const TaskList = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isOnline = useOnlineStatus();

  console.log("isOnline: ", isOnline);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const response = await offlineApi.get("/tasks");
        setTasks(response.data);
        setError("");
      } catch (err) {
        setError(
          "Failed to load tasks. " +
            (isOnline ? "Please try again." : "You are offline.")
        );
      } finally {
        setLoading(false);
      }
    };

    if (isOnline) {
      fetchTasks();
    }
  }, [isOnline]);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      const response = await offlineApi.post("/tasks", { title: newTaskTitle });
      if (response.data.queued) {
        setTasks((prev) => [
          ...prev,
          {
            id: `temp-${Date.now()}`,
            title: newTaskTitle,
            completed: false,
          },
        ]);
        setError("Task will be saved when online");
      } else {
        setTasks((prev) => [...prev, response.data]);
      }
      setNewTaskTitle("");
    } catch (err) {
      setError("Failed to add task");
    }
  };

  const handleToggleComplete = async (id: string, completed: boolean) => {
    try {
      const response = await offlineApi.put(`/tasks/${id}`, {
        completed: !completed,
      });
      if (response.data.queued) {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === id ? { ...task, completed: !completed } : task
          )
        );
      } else {
        setTasks((prev) =>
          prev.map((task) => (task.id === id ? response.data : task))
        );
      }
    } catch (_err) {
      setError("Failed to update task");
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await offlineApi.delete(`/tasks/${id}`);
      setTasks((prev) => prev.filter((task) => task.id !== id));
    } catch (err) {
      if (axios.isCancel(err)) {
        setTasks((prev) => prev.filter((task) => task.id !== id));
      } else {
        setError("Failed to delete task");
      }
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-slate-600">
      <div className="flex justify-between items-center leading-none">
        <h1 className="text-2xl font-bold mb-4">Task Manager</h1>
        <p className={`${isOnline ? "text-green-400" : "text-red-500"}`}>
          {isOnline ? "Online" : "Offline"}
        </p>
      </div>

      {!isOnline && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          <p>
            You are currently offline. Changes will be synced when you're back
            online.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}

      <div className="flex mb-4">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="New task title"
          className="flex-1 p-2 border rounded-l"
        />
        <button
          onClick={handleAddTask}
          className="bg-blue-500 text-white p-2 rounded-r hover:bg-blue-600"
        >
          Add Task
        </button>
      </div>

      {loading ? (
        <p>Loading tasks...</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center justify-between p-2 border rounded"
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => handleToggleComplete(task.id, task.completed)}
                  className="mr-2"
                />
                <span
                  className={task.completed ? "line-through text-gray-500" : ""}
                >
                  {task.title}
                </span>
              </div>
              <button
                onClick={() => handleDeleteTask(task.id)}
                className="text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TaskList;
