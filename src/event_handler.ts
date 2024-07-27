import { Server, Socket } from "socket.io";
import { Stroke } from "./util/types.js";
import { Database } from "./database/db.js";
import {} from "dotenv/config";
import dotenv from "dotenv";

export default class EventHandler {
  #io: Server;

  constructor(io: Server) {
    this.#io = io;
    // this.#db.connect()
  }

  clientConnection() {
    this.#io.on("connection", (socket: Socket) => {
      console.log("a client has successfully connected");

      this.#handleStroke(socket);
      this.#handleSave(socket);
      this.#handleLoad(socket);

      socket.on("disconnect", () => {
        console.log("client disconnected");
      });

      socket.on("error", (error: Error) => {
        console.log(error);
      });
    });
  }

  #handleStroke(socket: Socket) {
    socket.on("stroke", (data: Stroke) => {
      //   console.log("x: " + data.xPos);
      //   console.log("y:" + data.yPos);
      socket.broadcast.emit("stroke", data);
    });
  }

  #handleSave(socket: Socket) {
    socket.on("save", (data: Array<Stroke>) => {
      if (data.length > 0) {
        new Database(data).insert();
      }
    });
  }

  #handleLoad(socket: Socket) {
    socket.on("load", async (data: Array<Stroke>) => {
      const db = new Database(data);
      const tags = await db.fetch();
      socket.emit("loaded-tags", tags);
    });
  }
}
