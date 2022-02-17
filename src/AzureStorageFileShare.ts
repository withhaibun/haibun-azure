import { readFileSync, statSync, readdirSync } from 'fs';
import { dirname, basename } from 'path';

import { ShareServiceClient, ShareClient, StorageSharedKeyCredential, ShareDirectoryClient } from "@azure/storage-file-share";
import { TStorageEnv, AzureStorage } from './AzureStorage';

class AzureStorageFileShare extends AzureStorage {
  readdir(): Promise<any> {
    throw new Error('Method not implemented.');
  }
  startCopy(source: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  serviceClient: ShareServiceClient;
  shareClient?: ShareClient;
  shareName = 'e2e-reviews';

  constructor({ account, accountKey, destination: defaultContainer }: TStorageEnv) {
    super({account, accountKey, destination: defaultContainer});

    const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);

    this.serviceClient = new ShareServiceClient(
      `https://${account}.file.core.windows.net`,
      sharedKeyCredential
    );
  }

  private async getShareClient(shareName: string) {
    if (!this.shareClient) {
      this.shareClient = await this.serviceClient.getShareClient(shareName);
    }
    return this.shareClient;
  }

  private async getDirectoryClient(directoryName: string) {
    return (await this.getShareClient(this.shareName)).getDirectoryClient(directoryName);
  }

  async mkdir(directoryName: string) {
    console.log('mkdir', directoryName);
    const directoryClient = await this.getDirectoryClient(directoryName);
    await directoryClient.create();
    return directoryClient;
  }

  private async recurseCopy(source: string) {
    const entries = readdirSync(source);

    for (const entry of entries) {
      const here = `${source}/${entry}`;
      const stat = statSync(here);
      if (stat.isDirectory()) {
        await this.mkdir(here);
        await this.recurseCopy(here);
      } else {
        const content = readFileSync(here);
        await this.writeFile(`${source}/${entry}`, content);
      }
    }
  }

  async createShare(shareName: string) {
    const shareClient = this.serviceClient.getShareClient(shareName);
    await shareClient.create();
  }

  async setShare(shareName: string) {
    this.shareName = shareName;
    this.shareClient = undefined;
  }

  async rmdir(directoryName: string) {
    await (await this.getDirectoryClient(directoryName)).delete();
  }

  async printdir(dc: ShareDirectoryClient) {
    for await (const entity of dc.listFilesAndDirectories()) {
      if (entity.kind === "directory") {
        console.log(` directory\t: ${entity.name}`);
      } else {
        console.log(` file\t: ${entity.name}`);
      }
    }
  }

  async unlink(source: string) {
    const directoryName = dirname(source);
    const fileName = basename(source);
    console.log(directoryName, ',', fileName);
    const dc = (await this.getDirectoryClient(directoryName));
    await dc.deleteFile(fileName);
  }

  async recurseDeleteRemoteDirectory(source: string) {
    const entries = readdirSync(source);

    for (const entry of entries) {
      const here = `${source}/${entry}`;
      const stat = statSync(here);
      console.log('delete', here, stat.isDirectory() ? 'D' : 'F');
      if (stat.isDirectory()) {
        await this.recurseDeleteRemoteDirectory(here);
        await this.rmdir(here).catch(e => console.log(`rmdir ${here} failed: ${e.message}`));
      } else {
        await this.unlink(`${source}/${entry}`).catch(e => console.log(`unlink ${here} failed: ${e.message}`));;
      }
    }
    await this.rmdir(source).catch(e => console.log(`rmdir ${source} failed: ${e.message}`));
  }

  async writeFile(fileName: string, content: Buffer) {
    const directoryName = dirname(fileName)
    console.log('writeFile', directoryName, fileName);

    const directoryClient = await this.getDirectoryClient(directoryName);
    await this.printdir(directoryClient);

    const contentByteLength = Buffer.byteLength(content);
    const fileClient = directoryClient.getFileClient(fileName);
    await fileClient.create(contentByteLength);
    await fileClient.uploadRange(content, 0, contentByteLength);
    console.log(`Create file ${fileName} successfully`);
  }

  async copyLocalDirectory(source: string) {
    await this.mkdir(source);
    await this.recurseCopy(source);
  }
  async deleteRemoteAndCopyLocalDirectory(source: string) {
    this.setShare('noodles');
    await this.copyLocalDirectory(source);
    await this.recurseDeleteRemoteDirectory(source);
  }
}

const env = AzureStorage.getEnv(process.env);
const azfs = new AzureStorageFileShare(env);

azfs.deleteRemoteAndCopyLocalDirectory('./capture');
