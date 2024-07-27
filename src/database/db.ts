// Get the client
import mysql from "mysql2/promise";
import { v4 as uuid } from "uuid";
import { Stroke } from "../util/types.js";
import { ENV } from "../util/env.js";

export class Database {
  #tag_id = uuid();
  #tag: Array<Stroke>;

  constructor(tag: Array<Stroke>) {
    this.#tag = tag;
  }

  async insert() {
    const connection = this.#connect();

    try {
      //add tag
      (await connection).execute(`INSERT INTO tag (id) VALUES (?)`, [
        this.#tag_id,
      ]);

      //add strokes
      let queries: Promise<void>[] = this.#tag.map(async (stroke: Stroke) => {
        (await connection).execute(
          `INSERT INTO stroke (tag_id, x, y, color, size) VALUES (?, ?, ?, ?, ?)`,
          [this.#tag_id, stroke.x, stroke.y, stroke.color, stroke.size]
        );
      });
      Promise.all(queries);
      console.log(`new tag: ${this.#tag_id} added`);
    } catch (error) {
      console.error(error);
    } finally {
      (await connection).end();
      console.log("server has disconnected to the database");
    }
  }

  //fetches all the tags from users
  async fetch(): Promise<Stroke[]> {
    const connection = await this.#connect();

    try {
      const [result, packet]: [any[], mysql.FieldPacket[]] =
        await connection.execute("SELECT * FROM stroke");
      const tags = new Array<Stroke>();
      for (const value of result) {
        tags.push(new Stroke(value.x, value.y, value.color, value.size));
      }

      return tags;
    } catch (error) {
      console.log(error);
      throw error; // Rethrow the error if you want to handle it further up the call stack
    } finally {
      await connection.end();
      console.log("Server has disconnected from the database");
    }
  }

  #connect = async () => {
    // Create the connection to database
    const connection = await mysql.createConnection({
      host: ENV.DB_HOST,
      user: ENV.DB_USER,
      password: ENV.DB_PASSWORD,
      database: ENV.DB_NAME,
    });

    console.log("server has connected to the database");
    return connection;
  };
}
