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

  async updateTag(
    tagID: string,
    strokes: Array<Stroke>,
    username: string,
    imageFile: ImageFile
  ) {
    console.log("attempting to update tag....");
    //adds to artist to tag
    await this.ensureArtistTagConnection(username, tagID);
    const artistNames = await this.fetchArtistsNamesFromTag(tagID);
    await this.updateTagWithNewStrokes(
      tagID,
      strokes,
      imageFile,
      artistNames
    ).finally(() =>
      this.notifyOnCompletion(artistNames, tagID, imageFile, QueryType.update)
    );
  }

  async createCanvasPreview(
    tag: Array<Stroke>,
    user: string,
    imageFile: ImageFile | undefined
  ): Promise<void> {
    if (imageFile) {
      console.log("USER: " + user);
      const id = new ObjectId().toString();
      console.log("attempting to create tag....");
      await this.prisma.tag
        .create({
          data: {
            strokes: tag,
            imageFile: imageFile,
            id: id,
            artists: {
              connectOrCreate: {
                where: {
                  name: user, // Look for an existing user with this name
                },
                create: {
                  name: user, // If the user doesn't exist, create a new one
                },
              },
            },
          },
        })
        .catch(async (e) => {
          console.error(e);
          process.exit(1);
        })
        .finally(() =>
          this.notifyOnCompletion([user], id, imageFile, QueryType.create)
        );
    }
  }

  async getTagPreviews(): Promise<any[]> {
    const imgPreviews = await this.prisma.tag
      .findMany({
        select: {
          id: true,
          imageFile: true,
          artists: true,
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
      const usernames: string[] = data.artists.map((artist) => {
        return artist.name;
      });

      const preview: ImagePreview = {
        id: data.id,
        imageFile: data.imageFile,
        artists: usernames,
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

  async getArtist(id: string) {
    const tagArtistIDs = await this.prisma.tag.findFirst({
      where: {
        id: id,
      },
      select: {
        artistIds: true,
      },
    });

    const artistNames = await this.prisma.artist.findMany({
      where: {
        id: {
          in: tagArtistIDs?.artistIds,
        },
      },
    });

    console.log(artistNames);
  }

  //Dev only
  async reset(): Promise<void> {
    await this.prisma.artist.deleteMany();
    await this.prisma.tag.deleteMany();
  }

  private async ensureArtistTagConnection(
    username: string,
    tagID: string
  ): Promise<void> {
    await this.prisma.artist
      .upsert({
        where: {
          name: username,
        },
        update: {
          tags: {
            connect: {
              id: tagID,
            },
          },
        },
        create: {
          id: new ObjectId().toString(),
          name: username,
          tags: {
            connect: {
              id: tagID,
            },
          },
        },
      })
      .catch(async (e) => {
        console.error(e);
        process.exit(1);
      });
  }

  private async updateTagWithNewStrokes(
    tagID: string,
    strokes: Array<Stroke>,
    imageFile: ImageFile,
    artistNames: string[] | undefined
  ) {
    await this.prisma.tag
      .update({
        where: {
          id: tagID,
        },
        data: {
          strokes: strokes,
          imageFile: imageFile,
        },
      })
      .catch(async (e) => {
        console.error(e);
        process.exit(1);
      });
  }

  private async fetchArtistsNamesFromTag(
    tagID: string
  ): Promise<string[] | undefined> {
    const tag_artists = await this.prisma.tag.findUnique({
      where: {
        id: tagID,
      },
      select: {
        artists: true,
      },
    });
    const artistNames = tag_artists?.artists.map((artist) => {
      return artist.name;
    });
    return artistNames;
  }

  private async notifyOnCompletion(
    artistNames: string[] | undefined,
    tagID: string,
    imageFile: ImageFile,
    method: QueryType
  ) {
    const socketHandler = SocketEventHandler.getInstance();
    if (artistNames)
      socketHandler.notifyPreviewLoaded(tagID, imageFile, artistNames, method);
    console.log(`tag ${tagID} successfully updated`);
    await this.prisma.$disconnect();
  }

}
