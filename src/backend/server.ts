import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import * as http from "http";
import SocketListers from "./listeners.js";
import cors from "cors";

class SocketIOServer {
  #PORT: number;
  #HOSTNAME: string;
  #app: express.Application;
  #server: http.Server;
  #io: Server;
  #origin = "http://localhost:5173";

  constructor(port: number) {
    this.#PORT = port;
    this.#HOSTNAME = "localhost";
    this.#app = express();
    this.#server = createServer(this.#app);

    this.#io = new Server(this.#server, {
      cors: {
        origin: this.#origin,
        methods: ["GET", "POST"],
        credentials: true,
      },
    });
  }

  start() {
    this.#app.get("/", (req, res) => {
      res.set({
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Origin": this.#origin, 
        "Access-Control-Allow-Credentials": true,
      });
      res.send("Connected");
    });
    
    //handleEvents 
    const eventListeners = new SocketListers(this.#io);
    eventListeners.clientConnection();

    this.#server.listen(this.#PORT, this.#HOSTNAME, () => {
      console.log(`server running on http://${this.#HOSTNAME}:${this.#PORT}`);
    });
  }
}

const socketIOServer = new SocketIOServer(3000);
socketIOServer.start();
