import { DisconnectReason, Server, Socket } from "socket.io";
import { ImageFile, ImagePreviews, Stroke } from "./util/types.js";
import {} from "dotenv/config";
import MongoDatabase from "./database/db_mongo.js";
import { generateUsername } from "unique-username-generator";
import { bytesToMB } from "./util/functions.js";

export default class SocketEventHandler {
  private io: Server;
  private sessionUser: string;
  private sessions: Set<String> = new Set();
  private static instance: SocketEventHandler;

  static getInstance(io: Server) {
    if (!this.instance) {
      this.instance = new SocketEventHandler(io);
    }
    return this.instance;
  }

  private constructor(io: Server) {
    this.io = io;
    this.sessionUser = generateUsername("-", 2); // e.g blossom-logistical74
  }

  sendTagToDatabase(tag: Array<Stroke>, img: Express.Multer.File | undefined) {
    if (img) {
      const imageFile: ImageFile = {
        filename: img.originalname,
        buffer: img.buffer,
        mimetype: img.mimetype,
        size: bytesToMB(img.buffer.length),
      };
      const db = MongoDatabase.getInstance();
      db.createTag(tag, this.sessionUser, imageFile);
    }
  }

  setup() {
    this.io.on("connection", async (socket: Socket) => {
      //generate a new user per client session
      this.sessionUser = generateUsername("-", 2);
      console.log(` ${this.sessionUser} has successfully connected`);
      this.sessions.add(this.sessionUser);

      // session user should update each connection

      //Send amount of # of clients connected to the frontend
      this.io.emit("client-connected", this.sessions.size);

      //Load all graffiti tags saved in canvas
      const mdb = MongoDatabase.getInstance();
      const tagPreviews: ImagePreviews[] = await mdb.getTagPreviews();
      socket.emit("boot-up", this.sessionUser, this.sessions.size, tagPreviews);

      //Handles real-time paint strokes
      this.strokeListener(socket);

      //Saves strokes from a client
      this.saveListener(socket, this.sessionUser);

      //Resets the database
      this.clearListener(socket);

      //Handles real-time chat log
      this.chatListener(socket, this.sessionUser);

      socket.on("disconnect", (data: DisconnectReason) => {
        console.log(data);
        console.log(this.sessionUser + " has disconnected");
        this.sessions.delete(this.sessionUser);
        this.io.emit("client-disconnected", this.sessions.size);
      });

      socket.on("error", (error: Error) => {
        console.log(error);
      });
    });
  }

  private chatListener(socket: Socket, user: string) {
    socket.on("chat", (data: String) => {
      socket.broadcast.emit("chat", data, user);
    });
  }

  private strokeListener(socket: Socket) {
    socket.on("stroke", (data: Stroke) => {
      socket.broadcast.emit("stroke", data);
    });
  }

  private saveListener(socket: Socket, user: string) {
    socket.on("save", (data: Array<Stroke>, imageURL: string) => {
      console.log(data);
      if (data.length > 0) {
        MongoDatabase.getInstance().createTag(data, user, imageURL);
      }
    });
  }

  private clearListener(socket: Socket) {
    socket.on("clear", async () => {
      MongoDatabase.getInstance().reset();
    });
  }
}
