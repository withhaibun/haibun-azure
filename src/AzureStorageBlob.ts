import { readFileSync, statSync, readdirSync } from 'fs';
import { dirname } from 'path';

import { BlobServiceClient, StorageSharedKeyCredential, ContainerClient } from "@azure/storage-blob";
import { TStorageEnv, AzureStorage } from './AzureStorage';
const TYPES: { [type: string]: string } = {
  html: 'text/html',
  json: 'json',
  'webm': 'video/mp4'
}
class AzureStorageFileContainer extends AzureStorage {
  serviceClient: BlobServiceClient;
  containerClient?: ContainerClient

  constructor({ account, accountKey, defaultContainer }: TStorageEnv) {
    super({ account, accountKey, defaultContainer });

    const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);

    this.serviceClient = new BlobServiceClient(
      `https://${account}.blob.core.windows.net`,
      sharedKeyCredential
    );
  }

  private async getContainerClient() {
    if (!this.containerClient) {
      this.containerClient = await this.serviceClient.getContainerClient(this.containerName);
    }
    return this.containerClient;
  }

  async readdir() {
    let i = 0;
    for await (const blob of (await this.getContainerClient()).listBlobsFlat()) {
      console.log(`Blob ${i++}: ${blob.name}`);
    }
  }

  private async recurseCopy(source: string) {
    const entries = readdirSync(source);

    for (const entry of entries) {
      const here = `${source}/${entry}`;
      const stat = statSync(here);
      if (stat.isDirectory()) {
        await this.recurseCopy(here);
      } else {
        const content = readFileSync(here);
        await this.writeFile(`${source}/${entry}`, content);
      }
    }
  }

  async createContainer(containerName: string) {
    const containerClient = this.serviceClient.getContainerClient(containerName);
    await containerClient.create();
  }

  async setContainer(containerName: string) {
    this.containerClient = undefined;
    this.containerName = containerName;
  }

  async writeFile(fileName: string, content: Buffer) {
    const directoryName = dirname(fileName)
    console.log('writeFile', directoryName, fileName);
    const blobContentType = TYPES[fileName.replace(/.*\./, '')];
    if (!blobContentType) {
      throw Error(`unknown content type for '${fileName}'`);
    }

    const blockBlobClient = (await this.getContainerClient()).getBlockBlobClient(fileName.replace(/\//g, '_'));
    const uploadBlobResponse = await blockBlobClient.upload(content, Buffer.byteLength(content), { blobHTTPHeaders: { blobContentType } });
  }

  async copyLocalDirectory(source: string) {
    await this.recurseCopy(source);
  }

  async startCopy(source: string) {
    await this.readdir();
    await this.copyLocalDirectory(source);
  }
}

const env = AzureStorage.getEnv(process.env);
const azfs = new AzureStorageFileContainer(env);

azfs.startCopy('./capture');
