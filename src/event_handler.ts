import { DisconnectReason, Server, Socket } from "socket.io";
import { ImageFile, ImagePreview, Stroke } from "./util/types.js";
import {} from "dotenv/config";
import MongoDatabase from "./database/db_mongo.js";
import { generateUsername } from "unique-username-generator";
import { bytesToMB } from "./util/functions.js";
import { QueryType } from "./util/enums.js";

export default class SocketEventHandler {
  private sessionUser: string;
  private sessions: Set<String> = new Set();
  private static instance: SocketEventHandler;
  private socket: Socket | null = null; // Initialize with null

  static getInstance() {
    if (!this.instance) {
      this.instance = new SocketEventHandler();
    }
    return this.instance;
  }

  private constructor() {
    this.sessionUser = generateUsername("-", 2); // e.g blossom-logistical74
  }

  sendTagToDatabase(tag: Array<Stroke>, imageFile: ImageFile | undefined) {
    const db = MongoDatabase.getInstance();
    db.createTag(tag, this.sessionUser, imageFile);
  }

  setup(io: Server) {
    io.on("connection", async (socket: Socket) => {
      //generate a new user per client session
      this.socket = socket;
      this.sessionUser = generateUsername("-", 2);
      console.log(` ${this.sessionUser} has successfully connected`);
      this.sessions.add(this.sessionUser);

      // session user should update each connection

      //Send amount of # of clients connected to the frontend
      io.emit("client-connected", this.sessions.size);

      //Load all graffiti tags saved in canvas
      const mdb = MongoDatabase.getInstance();
      const tagPreviews: ImagePreview[] = await mdb.getTagPreviews();
      console.log(tagPreviews);
      socket.emit("boot-up", this.sessionUser, this.sessions.size, tagPreviews);

      //Handles real-time paint strokes
      this.strokeListener(socket);

      //Saves strokes from a client
      // this.saveListener(socket, this.sessionUser);

      //Resets the database
      this.clearListener(socket);

      //Handles real-time chat log
      this.chatListener(socket, this.sessionUser);

      socket.on("disconnect", (data: DisconnectReason) => {
        console.log(data);
        console.log(this.sessionUser + " has disconnected");
        this.sessions.delete(this.sessionUser);
        io.emit("client-disconnected", this.sessions.size);
      });

      socket.on("error", (error: Error) => {
        console.log(error);
      });
    });
  }

  async notifyPreviewLoaded(
    id: string,
    imageFile: ImageFile,
    query: QueryType
  ) {
    const imagePreview: ImagePreview = {
      id: id,
      imageFile: imageFile,
    };

    if (this.socket) {
      switch (query) {
        case QueryType.create:
          this.socket.emit("preview-loaded", imagePreview);
          break;
        case QueryType.update:
          this.socket.emit("preview-updated", imagePreview);
          break;
      }
    }
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

  private clearListener(socket: Socket) {
    socket.on("clear", async () => {
      MongoDatabase.getInstance().reset();
    });
  }
}
