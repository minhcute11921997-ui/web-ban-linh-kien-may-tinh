import axiosInstance from "./config";

export const sendChatMessage = (message, history = []) =>
  axiosInstance.post("/chatbot/message", { message, history });
