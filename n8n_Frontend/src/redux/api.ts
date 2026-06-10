import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000",
});

export const sendMessage = async (message: string) => {
  const res = await API.post("/chat", {
    message,
  });

  return res.data;
};