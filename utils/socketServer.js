// socket.js
import { Server } from "socket.io";
export let io;

export const initSocketServer = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*"
    }
  });
};
