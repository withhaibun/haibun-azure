import { basename, dirname } from 'path';
import { BlobServiceClient, StorageSharedKeyCredential, ContainerClient } from "@azure/storage-blob";
import { AzureStorage } from './azure-storage';
import { AStepper, CAPTURE, OK, TNamed, TWorld } from '@haibun/core/build/lib/defs';
import { getStepperOption } from '@haibun/core/build/lib/util';

import { ICreateStorageDestination } from "@haibun/domain-storage/build/domain-storage";
import { AStorage } from "@haibun/domain-storage/build/AStorage";
import { Timer } from '@haibun/core/build/lib/Timer';

const TYPES: { [type: string]: string } = {
  html: 'text/html',
  json: 'json',
  'webm': 'video/mp4'
}

class AzureStorageBlob extends AzureStorage implements ICreateStorageDestination {
  stat(dir: string) {
    throw new Error('Method not implemented.');
  }
  // directories are not required
  mkdir(dir: string) {
    return true;
  }
  // directories are not required
  mkdirp(dir: string) {
    return true;
  }
  // files are always ovewritten
  exists(ntt: string) {
    return false;
  }
  readFile(path: string, coding: string) {
    throw new Error('Method not implemented.');
  }
  serviceClient?: BlobServiceClient;
  containerClient?: ContainerClient;

  setWorld(world: TWorld, steppers: AStepper[]) {
    super.setWorld(world, steppers);
    const account = getStepperOption(this, 'ACCOUNT', world.extraOptions);
    const accountKey = getStepperOption(this, 'KEY', world.extraOptions);

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
    let files = [];
    for await (const blob of (await this.getContainerClient()).listBlobsFlat()) {
      files.push(blob.name);
    }
    return files;
  }
  async rmrf(inPrefix: string) {
    const files = await this.readdir();
    const prefix = this.pathed(inPrefix);
    const containerClient = this.serviceClient!.getContainerClient(this.destination!);
    for (const file of files) {
      this.getWorld().logger.log(`delete: ${file}`);
      if (file.startsWith(prefix)) {
        await containerClient.deleteBlob(file)
      }
    }
  }
  async createStorageDestination(containerName: string) {
    const containerClient = this.serviceClient!.getContainerClient(containerName);
    await containerClient.create({});
  }
  pathed(f: string) {
    console.log(this.getWorld().options);
    
    const setting = this.getWorld().options.SETTING || 'dev';
    const fn = basename(f);
    // FIXME: double slash
    const path = dirname(f).replace(`./${CAPTURE}/`, '').replace(/^\//, '').replace(/\//g, '_').replace(/__/g, '_');
    const datestring = Timer.startTime.toISOString().replace(/[T:-]/g, '').replace(/\..+/, '')
    const type = (TYPES[fn.replace(/.*\./, '')] || 'unknown').replace('/', '_');
    return [setting, type, datestring, path, fn].filter(p => p?.length > 0).join('-');
  }

  async writeFileBuffer(fileName: string, content: Buffer) {
    const blobContentType = TYPES[fileName.replace(/.*\./, '')];
    const dest = this.pathed(fileName);
    const containerClient = await this.getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(dest);

    const res = await blockBlobClient.upload(content, Buffer.byteLength(content), { blobHTTPHeaders: { blobContentType } });

    this.getWorld().logger.info(`uploaded ${dest}`);
  }
  steps = {
    ...AStorage.prototype.steps,
    coldPolicy: {
      gwta: `files in {where} go to cold storage in {x} months`,
      action: async ({ x, what }: TNamed) => {
        return OK;
      }
    },
    deletePolicy: {
      gwta: `files in {where} go to cold storage in {x} months`,
      action: async ({ x, what }: TNamed) => {
        return OK;
      }
    }
  }
}

export default AzureStorageBlob;