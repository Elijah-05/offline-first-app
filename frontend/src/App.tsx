import { useEffect } from "react";
import { processQueue } from "./api/offlineApi";
import TaskList from "./components/TaskList";

function App() {
  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((registration) => {
          console.log("ServiceWorker registration successful: ", registration);
        })
        .catch((err) => {
          console.log("ServiceWorker registration failed: ", err);
        });
    }

    // Process any queued requests on mount if online
    processQueue();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900">
      <p className="text-white">TEST</p>
      <TaskList />
    </div>
  );
}

export default App;
