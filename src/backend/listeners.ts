import { Server, Socket } from "socket.io";
import { BrushStroke } from "../util/types.js";

export default class SocketListers {
  #io: Server;
  constructor(io: Server) {
    this.#io = io;
  }

  clientConnection() {
    this.#io.on("connection", (socket: Socket) => {
      console.log("a client has successfully connected");

      socket.on("error", (error: Error) => {
        console.log(error);
      });

      this.#handleStroke(socket);

      socket.on("disconnect", () => {
        console.log("client disconnected");
      });
    });
  }

  #handleStroke(socket: Socket) {
    socket.on("stroke", (data: BrushStroke) => {
    //   console.log("x: " + data.xPos);
    //   console.log("y:" + data.yPos);
      socket.broadcast.emit("stroke", data);
    });
  }
}
