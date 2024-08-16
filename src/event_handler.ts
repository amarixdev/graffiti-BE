import { DisconnectReason, Server, Socket } from "socket.io";
import { ImageFile, ImagePreview, Stroke } from "./util/types.js";
import {} from "dotenv/config";
import MongoDatabase from "./database/db_mongo.js";
import { generateUsername } from "unique-username-generator";
import { QueryType } from "./util/enums.js";

export default class SocketEventHandler {
  private sessions: Map<String, Socket> = new Map();
  private static instance: SocketEventHandler;
  private io: Server | null = null;

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
    this.io = io;
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

      //Resets the database [DEV ONLY]
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
    const tryEmit = () => {
      if (this.io) {
        console.log("attempting to broadcast...");
        switch (query) {
          case QueryType.create:
            try {
              this.io.emit("preview-loaded", imagePreview);
            } catch (error) {
              console.error("Error emitting socket event [load]: ", error);
            }

            break;
          case QueryType.update:
            try {
              this.io.emit("preview-updated", imagePreview);
            } catch (error) {
              console.error("Error emitting socket event [update]: ", error);
            }
            break;
        }
      }
    };
    tryEmit();
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
