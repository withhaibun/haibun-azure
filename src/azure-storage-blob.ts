import { dirname } from 'path';

import { BlobServiceClient, StorageSharedKeyCredential, ContainerClient } from "@azure/storage-blob";
import { AzureStorage } from './azure-storage';
import { AStepper, TWorld } from '@haibun/core/build/lib/defs';
import { getStepperOption } from '@haibun/core/build/lib/util';

const TYPES: { [type: string]: string } = {
  html: 'text/html',
  json: 'json',
  'webm': 'video/mp4'
}

class AzureStorageBlob extends AzureStorage {
  stat(dir: string) {
    throw new Error('Method not implemented.');
  }
  mkdir(dir: string) {
    return true;
  }
  mkdirp(dir: string) {
    return true;
  }
  exists(ntt: string) {
    return false;
  }
  readFile(path: string, coding: string) {
    throw new Error('Method not implemented.');
  }
  serviceClient?: BlobServiceClient;
  containerClient?: ContainerClient

  setWorld(world: TWorld, steppers: AStepper[]) {
    super.setWorld(world, steppers);
    const account = getStepperOption(this, 'ACCOUNT', this.world!.options);
    const accountKey = getStepperOption(this, 'KEY', this.world!.options);

    const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);

    this.serviceClient = new BlobServiceClient(
      `https://${account}.blob.core.windows.net`,
      sharedKeyCredential
    );
  }

  private async getContainerClient() {
    if (!this.containerClient) {
      this.containerClient = await this.serviceClient!.getContainerClient(this.destination!);
    }
    return this.containerClient;
  }

  async readdir() {
    let i = 0;
    for await (const blob of (await this.getContainerClient()).listBlobsFlat()) {
      console.log(`Blob ${i++}: ${blob.name}`);
    }
  }
  async createContainer(containerName: string) {
    const containerClient = this.serviceClient!.getContainerClient(containerName);
    await containerClient.create();
  }

  async setContainer(containerName: string) {
    this.containerClient = undefined;
    this.destination = containerName;
  }

  async writeFileBuffer(fileName: string, content: Buffer) {
    const blobContentType = TYPES[fileName.replace(/.*\./, '')];
    const dest = fileName.replace(/\//g, '_');
    const containerClient = await this.getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(dest);

    await blockBlobClient.upload(content, Buffer.byteLength(content), { blobHTTPHeaders: { blobContentType } });
    this.getWorld().logger.debug(`uploaded ${dest}`);
  }
}

export default AzureStorageBlob;