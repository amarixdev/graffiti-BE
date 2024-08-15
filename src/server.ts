import express, { RequestHandler } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import * as http from "http";
import EventHandler from "./event_handler.js";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config();
import multer from "multer";
import MongoDatabase from "./database/db_mongo.js";
import { generateUsername } from "unique-username-generator";
import SocketEventHandler from "./event_handler.js";
import { Stroke, ImageFile } from "./util/types.js";
import { Http2ServerRequest } from "http2";
import { bytesToMB } from "./util/functions.js";
import { v4 as UUID } from "uuid";

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
    this.#app.use(
      cors({
        origin: this.#origin,
        methods: ["GET", "POST"],
        credentials: true,
      })
    );

    this.#app.use(express.json());
    this.#app.use(express.urlencoded({ extended: true }));
    this.#app.use(express.text());

    this.#io = new Server(this.#server, {
      cors: {
        origin: this.#origin,
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });
  }

  start() {
    this.#app.get("/", (req, res) => {
      res.set({
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Origin": this.#origin,
        "Access-Control-Allow-Credentials": true,
      });
    });

    // Configure multer for file uploads
    const storage = multer.memoryStorage();
    const upload = multer({ storage });

    // Handle POST request for image upload
    this.#app.post("/post-canvas", upload.single("image"), (req, res) => {
      const method = JSON.parse(req.body.method);
      const canvasId = JSON.parse(req.body.id);
      console.log(method);
      const tag: Array<Stroke> = JSON.parse(req.body.tag);
      const img: Express.Multer.File | undefined = req.file;

      if (img) {
        const imageFile: ImageFile = {
          filename: UUID(),
          buffer: img.buffer,
          mimetype: img.mimetype,
          size: bytesToMB(img.buffer.length),
        };

        if (method == "post") {
          SocketEventHandler.getInstance().sendTagToDatabase(tag, imageFile);
        } else {
          MongoDatabase.getInstance().updateTag(canvasId, tag, imageFile);
        }
      }

      res.json({
        message: "Data received",
        tag: JSON.parse(req.body.tag),
        file: req.file,
      });
    });

    this.#app.post("/render-canvas", async (req, res) => {
      const id = req.body;
      const data = await MongoDatabase.getInstance().getTagStrokes(id);
      res.json({
        message: "ID received",
        strokes: data?.strokes,
      });
    });

    SocketEventHandler.getInstance().setup(this.#io);
    this.#server.listen(this.#PORT, this.#HOSTNAME, () => {
      console.log(`server running on http://${this.#HOSTNAME}:${this.#PORT}`);
    });
  }
}

const socketIOServer = new SocketIOServer(3000);
socketIOServer.start();
