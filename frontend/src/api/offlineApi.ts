import axios, { AxiosRequestConfig } from "axios";
import { v4 as uuidv4 } from "uuid";

const API_BASE_URL = "http://localhost:3001/api";

interface QueuedRequest {
  id: string;
  config: AxiosRequestConfig;
  timestamp: number;
  retries: number;
}

const QUEUE_KEY = "offline-request-queue";

export const getQueue = (): QueuedRequest[] => {
  const queue = localStorage.getItem(QUEUE_KEY);
  return queue ? JSON.parse(queue) : [];
};

export const addToQueue = (config: AxiosRequestConfig): void => {
  const queue = getQueue();
  const queuedRequest: QueuedRequest = {
    id: uuidv4(),
    config,
    timestamp: Date.now(),
    retries: 0,
  };
  queue.push(queuedRequest);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const removeFromQueue = (id: string): void => {
  const queue = getQueue();
  const newQueue = queue.filter((req) => req.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
};

export const processQueue = async (): Promise<void> => {
  console.log("IsOnline: ", navigator.onLine);
  if (!navigator.onLine) return;

  const queue = getQueue();
  if (queue.length === 0) return;

  const processedIds: string[] = [];

  for (const item of queue) {
    try {
      const response = await axios(item.config);
      if (response.status >= 200 && response.status < 300) {
        processedIds.push(item.id);
      } else if (item.retries < 3) {
        item.retries += 1;
      } else {
        processedIds.push(item.id); // Max retries reached
      }
    } catch (error) {
      console.error("Failed to process queued request:", error);
    }
  }

  // Remove processed requests
  const newQueue = queue.filter((item) => !processedIds.includes(item.id));
  localStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
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
    addToQueue(config);
    throw new axios.Cancel("Request queued for offline processing");
  }

  return config;
});

// Response interceptor
offlineApi.interceptors.response.use(
  (response) => {
    // Cache GET responses
    if (response.config.method === "get" && response.status === 200) {
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
    return response;
  },
  async (error) => {
    if (
      axios.isCancel(error) &&
      error.message === "Request queued for offline processing"
    ) {
      return Promise.resolve({ data: { queued: true } });
    }

    // If offline and GET request, try to get from cache
    if (!navigator.onLine && error.config.method === "get") {
      const cache = await caches.open("api-cache-v1");
      const cachedResponse = await cache.match(error.config.url || "");

      if (cachedResponse) {
        const data = await cachedResponse.json();
        return Promise.resolve({ data });
      }
    }

    return Promise.reject(error);
  }
);

// Listen for online events to process queue
window.addEventListener("online", processQueue);

export default offlineApi;
