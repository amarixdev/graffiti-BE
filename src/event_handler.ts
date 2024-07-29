import { Server, Socket } from "socket.io";
import { Stroke } from "./util/types.js";
import { Database } from "./database/db.js";
import {} from "dotenv/config";
import dotenv from "dotenv";

export default class EventHandler {
  #io: Server;

  constructor(io: Server) {
    this.#io = io;
  }

  clientConnection() {
    this.#io.on("connection", async (socket: Socket) => {
      console.log("a client has successfully connected");

      //Load all graffiti tags saved in canvas
      const db = new Database();
      const tags = await db.fetch();
      socket.emit("boot-up", tags);

      //Handles real-time paint strokes
      this.#strokeListener(socket);

      //Saves strokes from a client
      this.#saveListener(socket);

      //Resets the database
      this.#clearListener(socket);

      socket.on("disconnect", () => {
        console.log("client disconnected");
      });

      socket.on("error", (error: Error) => {
        console.log(error);
      });

      //Load-Listener: FOR TESTING ONLY
      this.#loadListener(socket);
    });
  }

  #strokeListener(socket: Socket) {
    socket.on("stroke", (data: Stroke) => {
      socket.broadcast.emit("stroke", data);
    });
  }

  #saveListener(socket: Socket) {
    socket.on("save", (data: Array<Stroke>) => {
      if (data.length > 0) {
        new Database().insert(data);
      }
    });
  }

  #clearListener(socket: Socket) {
    socket.on("clear", async () => {
      new Database().clear();
    });
  }

  //FOR TESTING ONLY
  #loadListener(socket: Socket) {
    socket.on("load", async (data: Array<Stroke>) => {
      const db = new Database();
      const tags = await db.fetch();
      socket.emit("loaded-tags", tags);
    });
  }
}
