import { DisconnectReason, Server, Socket } from "socket.io";
import { ImageFile, ImagePreview, Stroke } from "./util/types.js";
import {} from "dotenv/config";
import MongoDatabase from "./database/db_mongo.js";
import { generateUsername } from "unique-username-generator";
import { QueryType } from "./util/enums.js";

export default class SocketEventHandler {
  private sessionUser: string;
  private sessions: Set<String> = new Set();
  private socket: Socket | null = null; // Initialize with null

  private static instance: SocketEventHandler;
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
    db.createCanvasPreview(tag, this.sessionUser, imageFile);
  }

  setup(io: Server) {
    io.on("connection", async (socket: Socket) => {
      //generate a new user per client session
      this.socket = socket;
      this.sessionUser = generateUsername("-", 2);
      console.log(`${this.sessionUser} has successfully connected`);
      this.sessions.add(this.sessionUser);

      // session user should update each connection

      //Send amount of # of clients connected to the frontend
      io.emit("client-connected", this.sessions.size);

      //Load all graffiti tags saved in canvas
      const mdb = MongoDatabase.getInstance();
      const tagPreviews: ImagePreview[] = await mdb.getTagPreviews();
      socket.emit("boot-up", this.sessionUser, this.sessions.size, tagPreviews);

      //Handles real-time paint strokes
      this.strokeListener(socket);

      //generate a new username
      this.generateUser(socket);

      //Resets the database
      this.clearListener(socket);

      //Handles real-time chat log
      this.chatListener(socket);

      //update session username
      this.updateUsername(socket);

      socket.on("disconnect", (data: DisconnectReason) => {
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
    username: string[] | null,
    query: QueryType
  ) {
    const imagePreview: ImagePreview = {
      id: id,
      imageFile: imageFile,
      artists: username,
    };
    console.log("server socket: " + this.socket);
    if (this.socket) {
      switch (query) {
        case QueryType.create:
          this.socket.emit("preview-loaded", imagePreview);
          console.log("loaded notified");
          break;
        case QueryType.update:
          this.socket.emit("preview-updated", imagePreview);
          console.log("update notified");
          break;
      }
    }
  }

  private generateUser(socket: Socket) {
    socket.on("generate-user", () => {
      const newUser = generateUsername("-", 2);
      this.sessionUser = newUser;
      socket.emit("generate-user", newUser);
    });
  }

  private updateUsername(socket: Socket) {
    socket.on("update-user", (newUser: string) => {
      this.sessionUser = newUser;
    });
  }

  private chatListener(socket: Socket) {
    socket.on("chat", (message: string) => {
      socket.broadcast.emit("chat", message, this.sessionUser);
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
