// import axios, { AxiosRequestConfig } from "axios";
// import { v4 as uuidv4 } from "uuid";

// const API_BASE_URL = "http://localhost:3001/api";

// interface QueuedRequest {
//   id: string;
//   config: AxiosRequestConfig;
//   timestamp: number;
//   retries: number;
// }

// const QUEUE_KEY = "offline-request-queue";

// export const getQueue = (): QueuedRequest[] => {
//   const queue = localStorage.getItem(QUEUE_KEY);
//   const queResponse = queue ? JSON.parse(queue) : [];
//   return queResponse;
// };

// export const addToQueue = (config: AxiosRequestConfig): void => {
//   if (!config || typeof config !== "object") {
//     console.error("Invalid request config:", config);
//     return;
//   }

//   const queue = getQueue();
//   const queuedRequest: QueuedRequest = {
//     id: uuidv4(),
//     config,
//     timestamp: Date.now(),
//     retries: 0,
//   };
//   queue.push(queuedRequest);
//   localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
// };

// export const removeFromQueue = (id: string): void => {
//   const queue = getQueue();
//   const newQueue = queue.filter((req) => req.id !== id);
//   localStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
// };

// export const processQueue = async (): Promise<void> => {
//   console.log("processingQues...");
//   const queue = getQueue();

//   if (!navigator.onLine || (Array.isArray(queue) && queue.length === 0)) return;

//   const processedIds: string[] = [];
//   console.log("processedIds: ", processedIds);

//   const item = queue[0];
//   // for (const item of queue) {
//   if (!item.config || typeof item.config !== "object") {
//     console.error("Invalid config object:", item.config);
//     // continue;
//   } else if (item.config) {
//     console.log("item: ", item);
//     console.log("item.Config: ", item.config);
//     try {
//       const response = await axios(item.config);
//       if (response.status >= 200 && response.status < 300) {
//         processedIds.push(item.id);
//         console.log("removed with success");
//       } else if (item.retries < 1) {
//         item.retries += 1;
//       } else {
//         console.log("removed with retry rich");
//         processedIds.push(item.id); // Max retries reached
//       }
//     } catch (error) {
//       console.error("Failed to process queued request:", error);
//       if (axios.isAxiosError(error)) {
//         console.error("Axios Error Details:", error.response);
//       }
//     }
//   }
//   // }

//   // Remove processed requests
//   const newQueue = queue.filter((item) => !processedIds.includes(item.id));
//   try {
//     localStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
//   } catch (e) {
//     console.error("localStorage error:", e);
//   }

//   // const newQueue = queue.filter((item) => !processedIds.includes(item.id));
//   // localStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
// };

// // Custom offline-first axios instance
// const offlineApi = axios.create({
//   baseURL: API_BASE_URL,
// });

// // Request interceptor
// offlineApi.interceptors.request.use(async (config) => {
//   const isMutation =
//     config.method && ["post", "put", "patch", "delete"].includes(config.method);

//   if (!navigator.onLine && isMutation) {
//     console.log("offline & isMutation: ");
//     addToQueue(config);
//     throw new axios.Cancel("Request queued for offline processing");
//   }

//   console.log("req config: ", config);
//   return config;
// });

// // Response interceptor
// offlineApi.interceptors.response.use(
//   (response) => {
//     // Cache GET responses
//     if (response.config.method === "get" && response.status === 200) {
//       console.log("success: ");
//       caches.open("api-cache-v1").then((cache) => {
//         const url = new URL(response.config.url || "", API_BASE_URL);
//         const request = new Request(url.toString());
//         cache.put(
//           request,
//           new Response(JSON.stringify(response.data), {
//             headers: { "Content-Type": "application/json" },
//           })
//         );
//       });
//     }
//     console.log("get response: ", response);
//     return response;
//   },
//   async (error) => {
//     if (
//       axios.isCancel(error) &&
//       error.message === "Request queued for offline processing"
//     ) {
//       console.log("req canceled: ", error);
//       return Promise.resolve({ data: { queued: true } });
//     }

//     // If offline and GET request, try to get from cache
//     if (!navigator.onLine && error.config.method === "get") {
//       const cache = await caches.open("api-cache-v1");
//       const cachedResponse = await cache.match(error.config.url || "");
//       console.log("cacheRespo: ", cachedResponse);
//       if (cachedResponse) {
//         const data = await cachedResponse.json();
//         console.log("data res: ", data);
//         return Promise.resolve({ data });
//       }
//     }

//     return Promise.reject(error);
//   }
// );

// // Listen for online events to process queue
// window.addEventListener("online", processQueue);

// export default offlineApi;


import axios, { AxiosRequestConfig } from "axios";
import { v4 as uuidv4 } from "uuid";

const API_BASE_URL = "http://localhost:3001/api";

interface QueuedRequest {
  id: string;
  config: AxiosRequestConfig;
  timestamp: number;
  retries: number;
}

// IndexedDB setup
const DB_NAME = "OfflineRequestDB";
const STORE_NAME = "queued_requests";
let db: IDBDatabase;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const getQueue = async (): Promise<QueuedRequest[]> => {
  try {
    await initDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        resolve([]);
      };
    });
  } catch (error) {
    console.error("IndexedDB error:", error);
    return [];
  }
};

export const addToQueue = async (config: AxiosRequestConfig): Promise<void> => {
  if (!config || typeof config !== "object") {
    console.error("Invalid request config:", config);
    return;
  }

  try {
    await initDB();
    const queuedRequest: QueuedRequest = {
      id: uuidv4(),
      config,
      timestamp: Date.now(),
      retries: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(queuedRequest);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to add to queue:", error);
  }
};

export const removeFromQueue = async (id: string): Promise<void> => {
  try {
    await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to remove from queue:", error);
  }
};

export const processQueue = async (): Promise<void> => {
  console.log("processingQues...");
  const queue = await getQueue();

  if (!navigator.onLine || queue.length === 0) return;

  const processedIds: string[] = [];
  console.log("processedIds: ", processedIds);

  const item = queue[0];
  if (!item.config || typeof item.config !== "object") {
    console.error("Invalid config object:", item.config);
  } else {
    console.log("item: ", item);
    console.log("item.Config: ", item.config);
    try {
      const response = await axios(item.config);
      if (response.status >= 200 && response.status < 300) {
        processedIds.push(item.id);
        console.log("removed with success");
      } else if (item.retries < 1) {
        item.retries += 1;
        // Update the retry count in IndexedDB
        await updateQueueItem(item);
      } else {
        console.log("removed with retry rich");
        processedIds.push(item.id);
      }
    } catch (error) {
      console.error("Failed to process queued request:", error);
      if (axios.isAxiosError(error)) {
        console.error("Axios Error Details:", error.response);
      }
    }
  }

  // Remove processed requests
  await Promise.all(processedIds.map(id => removeFromQueue(id)));
};

const updateQueueItem = async (item: QueuedRequest): Promise<void> => {
  try {
    await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to update queue item:", error);
  }
};

// Custom offline-first axios instance
const offlineApi = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor
offlineApi.interceptors.request.use(async (config) => {
  const isMutation =
    config.method && ["post", "put", "patch", "delete"].includes(config.method);

  if (!navigator.onLine && isMutation) {
    console.log("offline & isMutation: ");
    await addToQueue(config);
    throw new axios.Cancel("Request queued for offline processing");
  }

  console.log("req config: ", config);
  return config;
});

// Response interceptor
offlineApi.interceptors.response.use(
  (response) => {
    // Cache GET responses
    if (response.config.method === "get" && response.status === 200) {
      console.log("success: ");
      caches.open("api-cache-v1").then((cache) => {
        const url = new URL(response.config.url || "", API_BASE_URL);
        const request = new Request(url.toString());
        cache.put(
          request,
          new Response(JSON.stringify(response.data), {
            headers: { "Content-Type": "application/json" },
          })
        );
      });
    }
    console.log("get response: ", response);
    return response;
  },
  async (error) => {
    if (
      axios.isCancel(error) &&
      error.message === "Request queued for offline processing"
    ) {
      console.log("req canceled: ", error);
      return Promise.resolve({ data: { queued: true } });
    }

    // If offline and GET request, try to get from cache
    if (!navigator.onLine && error.config.method === "get") {
      const cache = await caches.open("api-cache-v1");
      const cachedResponse = await cache.match(error.config.url || "");
      console.log("cacheRespo: ", cachedResponse);
      if (cachedResponse) {
        const data = await cachedResponse.json();
        console.log("data res: ", data);
        return Promise.resolve({ data });
      }
    }

    return Promise.reject(error);
  }
);

// Listen for online events to process queue
window.addEventListener("online", processQueue);

export default offlineApi;