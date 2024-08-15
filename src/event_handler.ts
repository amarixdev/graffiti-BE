import { DisconnectReason, Server, Socket } from "socket.io";
import { ImageFile, ImagePreview, Stroke } from "./util/types.js";
import {} from "dotenv/config";
import MongoDatabase from "./database/db_mongo.js";
import { generateUsername } from "unique-username-generator";
import { QueryType } from "./util/enums.js";

export default class SocketEventHandler {
  private sessions: Map<String, Socket> = new Map();
  private static instance: SocketEventHandler;
  static getInstance() {
    if (!this.instance) {
      this.instance = new SocketEventHandler();
    }
    return this.instance;
  }

  private constructor() {}

  sendTagToDatabase(
    tag: Array<Stroke>,
    artist: string,
    imageFile: ImageFile | undefined
  ) {
    const db = MongoDatabase.getInstance();
    db.createCanvasPreview(tag, artist, imageFile);
  }

  setup(io: Server) {
    io.on("connection", async (socket: Socket) => {
      //generate a new user per client session
      this.sessions.set(socket.id, socket);
      console.log("socketID: " + socket.id);
      io.emit("client-connected", this.sessions.size);
      const sessionUsername = generateUsername("-", 2);

      //Load all graffiti tags saved in canvas
      const mdb = MongoDatabase.getInstance();
      const tagPreviews: ImagePreview[] = await mdb.getTagPreviews();
      socket.emit("boot-up", sessionUsername, this.sessions.size, tagPreviews);

      //Handles real-time paint strokes
      this.strokeListener(socket);

      //generate a new username
      this.generateUser(socket);

      //Resets the database
      this.clearListener(socket);

      //Handles real-time chat log
      this.chatListener(socket);

      socket.on("disconnect", (data: DisconnectReason) => {
        this.sessions.delete(socket.id);
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

    const currentSockets = Array.from(this.sessions.values());
    const firstConnectedSocket = currentSockets[0];
    if (firstConnectedSocket) {
      switch (query) {
        case QueryType.create:
          firstConnectedSocket.broadcast.emit("preview-loaded", imagePreview);
          console.log("loaded notified");
          break;
        case QueryType.update:
          firstConnectedSocket.broadcast.emit("preview-updated", imagePreview);
          console.log("update notified");
          break;
      }
    }
  }

  private generateUser(socket: Socket) {
    socket.on("generate-user", () => {
      const newUser = generateUsername("-", 2);
      // this.sessionUser = newUser;
      socket.emit("generate-user", newUser);
    });
  }

  private chatListener(socket: Socket) {
    socket.on("chat", (message: string, artist: string) => {
      socket.broadcast.emit("chat", message, artist);
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
