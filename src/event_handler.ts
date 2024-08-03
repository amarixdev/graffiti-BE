import { Server, Socket } from "socket.io";
import { Stroke } from "./util/types.js";
import {} from "dotenv/config";
import { generateUsername } from "unique-username-generator";
import MongoDatabase from "./database/db_mongo.js";

export default class EventHandler {
  #io: Server;

  constructor(io: Server) {
    this.#io = io;
  }

  #clientCount: number = 0;

  clientConnection() {
    this.#io.on("connection", async (socket: Socket) => {
      let user = generateUsername("-", 2); // e.g blossom-logistical7

      console.log(` ${user} has successfully connected`);

      //Send amount of # of clients connected to the frontend
      this.#clientCount++;
      this.#io.emit("client-connected", this.#clientCount);

      //Load all graffiti tags saved in canvas
      const mdb = new MongoDatabase();
      const tagPreviews = await mdb.getTagPreviews();
      socket.emit("boot-up", user, this.#clientCount, tagPreviews);

      //Handles real-time paint strokes
      this.#strokeListener(socket);

      //Saves strokes from a client
      this.#saveListener(socket, user);

      //Resets the database
      this.#clearListener(socket);

      //Handles real-time chat log
      this.#chatListener(socket, user);

      socket.on("disconnect", () => {
        console.log("client disconnected");
        this.#clientCount--;
        this.#io.emit("client-disconnected", this.#clientCount);
      });

      socket.on("error", (error: Error) => {
        console.log(error);
      });
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

  #saveListener(socket: Socket, user: string) {
    socket.on("save", (data: Array<Stroke>, imageURL: string) => {
      if (data.length > 0) {
        new MongoDatabase().createTag(data, user, imageURL);
      }
    });
  }

  #clearListener(socket: Socket) {
    socket.on("clear", async () => {
      new MongoDatabase().reset();
    });
  }
}
