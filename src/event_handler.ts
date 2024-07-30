import { Server, Socket } from "socket.io";
import { Stroke } from "./util/types.js";
import { Database } from "./database/db.js";
import {} from "dotenv/config";
import { generateFromEmail, generateUsername } from "unique-username-generator";

export default class EventHandler {
  #io: Server;

  constructor(io: Server) {
    this.#io = io;
  }

  #numberOfClientsConnected: number = 0;

  clientConnection() {
    this.#io.on("connection", async (socket: Socket) => {
      let user = generateUsername("-", 1); // e.g blossom-logistical7

      console.log(` ${user} has successfully connected`);

      //Send amount of # of clients connected to the frontend
      this.#numberOfClientsConnected++;
      this.#io.emit("client-connected", this.#numberOfClientsConnected);

      //Load all graffiti tags saved in canvas
      const db = new Database();
      const tags = await db.fetch();
      socket.emit("boot-up", tags, user);

      //Handles real-time paint strokes
      this.#strokeListener(socket);

      //Saves strokes from a client
      this.#saveListener(socket);

      //Resets the database
      this.#clearListener(socket);

      //Handles real-time chat log
      this.#chatListener(socket, user);

      socket.on("disconnect", () => {
        console.log("client disconnected");
        this.#numberOfClientsConnected--;
        this.#io.emit("client-disconnected", this.#numberOfClientsConnected);
      });

      socket.on("error", (error: Error) => {
        console.log(error);
      });

      //Load-Listener: FOR TESTING ONLY
      this.#loadListener(socket);
    });
  }

  #chatListener(socket: Socket, user: string) {
    socket.on("chat", (data: String) => {
      socket.broadcast.emit("chat", data, user);
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
        console.log(data);
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
