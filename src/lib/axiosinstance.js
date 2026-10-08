import axios from "axios";

const baseURL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "http://localhost:5000";

const axiosInstance = axios.create({
  baseURL: baseURL,
});

export default axiosInstance;

