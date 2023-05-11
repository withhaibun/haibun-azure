import { basename, dirname } from 'path';
import { BlobServiceClient, StorageSharedKeyCredential, ContainerClient } from "@azure/storage-blob";

import { AzureStorage } from './azure-storage.js';
import { AStepper, CAPTURE, TWorld } from '@haibun/core/build/lib/defs.js';
import { getStepperOption } from '@haibun/core/build/lib/util/index.js';

import { guessMediaType, ICreateStorageDestination, TMediaType, EMediaTypes } from "@haibun/domain-storage/build/domain-storage.js";
import { Timer } from '@haibun/core/build/lib/Timer.js';
import { IFile } from '@haibun/domain-storage/build/AStorage.js';

export const DEFAULT_SETTING = 'DEFAULT_SETTING';
class AzureStorageBlob extends AzureStorage implements ICreateStorageDestination {
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
  async readFile(path: string, coding: string) {
    const blockBlobClient = (await this.getContainerClient()).getBlockBlobClient(path);
    const res = await blockBlobClient.download(0);
    const text = streamToText(res.readableStreamBody)
    return text;
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

  async readdir(dir: string): Promise<string[]> {
    const ifiles = await this.readdirStat(dir);
    return ifiles.map(f => f.name);
  }
  async readdirStat(dir: string): Promise<IFile[]> {
    let i = 0;
    let files: IFile[] = [];
    for await (const blob of (await this.getContainerClient()).listBlobsFlat()) {
      const ifile = {
        name: blob.name,
        created: blob.properties.createdOn?.getDate()!,
        isDirectory: false,
        isFile: true
      }
      files.push(ifile);
    }
    return files;
  }
  private _getSetting() {
    const setting = this.getWorld().options.SETTING || DEFAULT_SETTING;
    return setting;

  }
  async rmrf(start: string) {
    const files = await this.readdir(start);
    this.getWorld().logger.log(`rm ${files.length} files`);
    
    const containerClient = this.serviceClient!.getContainerClient(this.destination!);
    const  SETTING  = this._getSetting();
    const prefix = SETTING ? `${SETTING}-${start}` : 'start';

    for (const file of files) {
      if (file.startsWith(prefix)) {
        const res = await containerClient.deleteBlob(file)
        this.getWorld().logger.log(`delete ${prefix}: ${file} ${res._response.status}`);
      }
    }
  }
  async createStorageDestination(containerName: string) {
    const containerClient = this.serviceClient!.getContainerClient(containerName);
    await containerClient.create({});
  }

  pathed(mediaType: TMediaType, f: string) {
    const fn = basename(f);
    const setting = this._getSetting();

    // FIXME: double slash
    const path = dirname(f).replace(`./${CAPTURE}/`, '').replace(/\//g, '_').replace(/__/g, '_');
    const datestring = Timer.startTime.toISOString().replace(/[T:-]/g, '').replace(/\..+/, '')
    return [setting, mediaType, datestring, path, fn].filter(p => p?.length > 0).join('-');
  }

  async writeFileBuffer(fileName: string, content: Buffer, mediaType: EMediaTypes) {
    const blobContentType: TMediaType = guessMediaType(fileName);
    const dest = this.pathed(mediaType, fileName);
    const containerClient = await this.getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(dest);

    const res = await blockBlobClient.upload(content, Buffer.byteLength(content), { blobHTTPHeaders: { blobContentType } });

    this.getWorld().logger.info(`uploaded ${dest}`);
  }
}

export default AzureStorageBlob;

// FIXME
async function streamToText(readable: any) {
  readable.setEncoding('utf8');
  let data = '';
  for await (const chunk of readable) {
    data += chunk;
  }
  return data;
}
