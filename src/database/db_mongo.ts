import { PrismaClient } from "@prisma/client";
import { ImagePreviews, Stroke } from "../util/types.js";

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

  async createTag(
    tag: Array<Stroke>,
    user: string,
    imageFile: any
  ): Promise<void> {
    console.log("attempting to create tag....");
    await this.prisma.tag
      .create({
        data: {
          strokes: tag,
          imageFile: imageFile,
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
        await this.prisma.$disconnect();
      });
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
      const preview = {
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
