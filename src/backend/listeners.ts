import { Server, Socket } from "socket.io";

export default class SocketListers {
    #io: Server
    constructor(io: Server) {
        this.#io = io
    }

    clientConnection() {
        this.#io.on("connection", (socket:Socket) => {
            console.log("a client has successfully connected")

            socket.on("error", (error: Error) => {
                console.log(error)
            })
            socket.on("disconnect", () => {
                console.log("client disconnected")    
            })
        })
    }
}