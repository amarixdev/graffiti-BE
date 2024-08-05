import { PrismaClient } from "@prisma/client";
import { ImageFile, ImagePreview, Stroke } from "../util/types.js";
import SocketEventHandler from "../event_handler.js";
import { ObjectId } from "mongodb";
import { QueryType } from "../util/enums.js";

export default class MongoDatabase {
  prisma = new PrismaClient();

  private constructor() {}
  private static instance: MongoDatabase;

  static getInstance() {
    if (!this.instance) {
      this.instance = new MongoDatabase();
    }
    return this.instance;
  }

  async updateTag(id: string, strokes: Array<Stroke>, imageFile: ImageFile) {
    console.log("attempting to update tag....");
    await this.prisma.tag
      .update({
        where: {
          id: id,
        },
        data: {
          strokes: strokes,
          imageFile: imageFile,
        },
      })
      .catch(async (e) => {
        console.error(e);
        process.exit(1);
      })
      .finally(async () => {
        const socketHandler = SocketEventHandler.getInstance();
        socketHandler.notifyPreviewLoaded(id, imageFile, QueryType.update);
        console.log(`tag ${id} successfully updated`);
        await this.prisma.$disconnect();
      });
  }

  async createTag(
    tag: Array<Stroke>,
    user: string,
    imageFile: ImageFile | undefined
  ): Promise<void> {
    if (imageFile) {
      const id = new ObjectId().toString();
      console.log("attempting to create tag....");
      await this.prisma.tag
        .create({
          data: {
            strokes: tag,
            imageFile: imageFile,
            id: id,
            artists: {
              create: {
                name: user,
              },
            },
          },
        })
        .catch(async (e) => {
          console.error(e);
          process.exit(1);
        })
        .finally(async () => {
          console.log(`${user}'s tag successfully added`);
          const socketHandler = SocketEventHandler.getInstance();

          //notify client when tag has been created; sends the canvas preview
          socketHandler.notifyPreviewLoaded(id, imageFile, QueryType.create);
          await this.prisma.$disconnect();
        });
    }
  }

  async getTagPreviews(): Promise<any[]> {
    const imgPreviews = await this.prisma.tag
      .findMany({
        select: {
          id: true,
          imageFile: true,
        },
      })
      .catch(async (e) => {
        console.error(e);
        process.exit(1);
      })
      .finally(async () => {
        await this.prisma.$disconnect();
      });

    const previews = imgPreviews.map((data) => {
      const preview: ImagePreview = {
        id: data.id,
        imageFile: data.imageFile,
      };
      return preview;
    });

    return previews;
  }

  async getTagStrokes(id: string) {
    const tag = await this.prisma.tag
      .findFirst({
        where: {
          id: id,
        },
        select: {
          strokes: true,
        },
      })
      .catch(async (e) => {
        console.error(e);
        process.exit(1);
      })
      .finally(async () => {
        await this.prisma.$disconnect();
      });

    return tag;
  }

  //Dev only
  async reset(): Promise<void> {
    await this.prisma.artist.deleteMany();
    await this.prisma.tag.deleteMany();
  }
}
