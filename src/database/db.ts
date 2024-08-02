// Get the client
import mysql from "mysql2/promise";
import { v4 as uuid } from "uuid";
import { Stroke } from "../util/types.js";
import { ENV } from "../util/env.js";

export class Database {
  #tag_id = uuid();

  async insert(tag: Array<Stroke>, user: string) {
    const connection = await this.#connect();

    //OPTIMIZATION: delete covered up spray paint before inserting
    const strokes = Object.values(tag);
    // try {
    //   const deletionRadius = 8;
    //   let queries = strokes.map(async (stroke: Stroke) => {
    //     const [result] = await connection.execute(
    //       `DELETE FROM stroke WHERE
    //      POW(x - ?, 2) + POW(y - ?, 2) <= POW(?, 2)`,
    //       [
    //         // Center of the circle and radius
    //         Math.round(stroke.x),
    //         Math.round(stroke.y),
    //         deletionRadius,
    //       ]
    //     );
    //   });

    //   await Promise.all(queries);
    // } catch (err) {
    //   console.log(err);
    // }

    try {
      //add tag
      await connection.execute(`INSERT INTO tag (id) VALUES (?)`, [user]);

      //add strokes
      let queries: Promise<void>[] = tag.map(async (stroke: Stroke) => {
        await connection.execute(
          `INSERT INTO stroke (tag_id, x, y, px, py, color, size) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            user,
            stroke.x,
            stroke.y,
            stroke.px,
            stroke.py,
            stroke.color,
            stroke.size,
          ]
        );
      });
      Promise.all(queries);
      console.log(`new tag: ${user} added`);
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
        tags.push(
          new Stroke(
            value.x,
            value.y,
            value.px,
            value.py,
            value.color,
            value.size
          )
        );
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

  clear = async () => {
    const connection = await this.#connect();
    try {
      await connection.execute("SET FOREIGN_KEY_CHECKS = 0");
      await connection.execute("DELETE FROM tag");
      await connection.execute("DELETE FROM stroke");
      console.log("database reset");
    } catch (error) {
      console.log(error);
    }
  };

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
