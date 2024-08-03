import { PrismaClient } from "@prisma/client";
import { ImagePreviews, Stroke } from "../util/types.js";

export default class MongoDatabase {
  prisma = new PrismaClient();

  async createTag(
    tag: Array<Stroke>,
    user: string,
    imageURL: string
  ): Promise<void> {
    await this.prisma.tag
      .create({
        data: {
          strokes: tag,
          imageURL: imageURL,
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

  async getTagPreviews(): Promise<ImagePreviews[]> {
    const imgPreviews: ImagePreviews[] = await this.prisma.tag
      .findMany({
        select: {
          imageURL: true,
        },
      })
      .catch(async (e) => {
        console.error(e);
        process.exit(1);
      })
      .finally(async () => {
        await this.prisma.$disconnect();
      });

    return imgPreviews;
  }

  //Dev only
  async reset(): Promise<void> {
    await this.prisma.artist.deleteMany();
    await this.prisma.tag.deleteMany();
  }
}
