import axiosInstance from "./config";

export const sendChatMessage = (message) =>
  axiosInstance.post("/chatbot/message", { message });
