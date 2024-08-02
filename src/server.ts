import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import * as http from "http";
import EventHandler from "./event_handler.js";
import dotenv from "dotenv";
dotenv.config();
console.log(process.env.DB_NAME);

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

  //TODO: Serve the latest wall-state
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
    const handler = new EventHandler(this.#io);
    handler.clientConnection();

    this.#server.listen(this.#PORT, this.#HOSTNAME, () => {
      console.log(`server running on http://${this.#HOSTNAME}:${this.#PORT}`);
    });
  }
}

const socketIOServer = new SocketIOServer(3000);
socketIOServer.start();
