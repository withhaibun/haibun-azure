import { basename, dirname } from 'path';
import { BlobServiceClient, StorageSharedKeyCredential, ContainerClient } from "@azure/storage-blob";

import { AzureStorage, STRICT_PATH } from './azure-storage.js';
import { AStepper, CAPTURE, TWorld } from '@haibun/core/build/lib/defs.js';
import { getStepperOption } from '@haibun/core/build/lib/util/index.js';
import { guessMediaType, ICreateStorageDestination, TMediaType, IFile, IGetPublishedReviews, TPathedOrString, actualPath, isPathed } from "@haibun/domain-storage/build/domain-storage.js";
import { Timer } from '@haibun/core/build/lib/Timer.js';

let endpoint = '';

export const DEFAULT_SETTING = '';
class AzureStorageBlob extends AzureStorage implements ICreateStorageDestination, IGetPublishedReviews {
  rm(path: string) {
    throw new Error('Method not implemented.');
  }

  // return a resolved version of getPublishedReviews with static endpoint
  public endpoint = (path: string) => `https://${this.account}.blob.core.windows.net/${path}/`;

  public async getPublishedReviews() {
    const xml = await (await fetch(`${endpoint}?restype=container&comp=list`)).text().catch(e => {
      console.error(this.constructor.name, 'indexer failed', e);
      throw (e);
    });
    const res = [...xml.matchAll(/<Name>(.*?)<\/Name>/g)].map(match => match[1]);
    return <string[]>res;
  }

  strictPath: boolean = false;
  account?: string;
  accountKey?: string;
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

  async setWorld(world: TWorld, steppers: AStepper[]) {
    await super.setWorld(world, steppers);
    this.account = getStepperOption(this, 'ACCOUNT', world.extraOptions);
    this.accountKey = getStepperOption(this, 'KEY', world.extraOptions);
    this.strictPath = !!getStepperOption(this, STRICT_PATH, world.extraOptions);

    const sharedKeyCredential = new StorageSharedKeyCredential(this.account, this.accountKey);

    this.serviceClient = new BlobServiceClient(
      `https://${this.account}.blob.core.windows.net`,
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
    let files: IFile[] = [];
    for await (const blob of (await this.getContainerClient()).listBlobsFlat()) {
      const ifile = {
        name: blob.name,
        created: blob.properties.createdOn?.getDate()!,
        isDirectory: false,
        isFile: true,
        size: blob.properties.contentLength!
      }
      files.push(ifile);
    }
    return files;
  }
  async lstatToIFile(file: string) {
    const props = await (await this.getContainerClient()).getBlobClient(file).getProperties();
    const ifile = {
      name: file,
      created: props.createdOn?.getDate()!,
      isDirectory: false,
      isFile: true
    }
    return <IFile>ifile;
  }
  private _getOption(option: string, def?: string) {
    return this.getWorld().options[option] || def;
  }

  async rmrf(start: string) {
    const SETTING = this._getOption('SETTING', DEFAULT_SETTING);
    const prefix = SETTING ? `${SETTING}-${start}` : start;
    const files = (await this.readdir(start)).filter(f => this.strictPath ? true : f.startsWith(prefix));
    this.getWorld().logger.log(`rm ${files.length} files${prefix && ` matching ${prefix}`}`);

    const containerClient = this.serviceClient!.getContainerClient(this.destination!);

    for (const file of files) {
      const res = await containerClient.deleteBlob(file)
      this.getWorld().logger.log(`delete ${prefix}: ${file} ${res._response.status}`);
    }
  }
  async createStorageDestination(containerName: string) {
    const containerClient = this.serviceClient!.getContainerClient(containerName);
    await containerClient.create({});
  }

  pathed(mediaType: TMediaType, f: string) {
    if (this.strictPath) {
      return f;
    }
    const fn = basename(f);
    const setting = this._getOption('SETTING', DEFAULT_SETTING);

    // FIXME: double slash
    const path = dirname(f).replace(`./${CAPTURE}/`, '').replace(/\//g, '_').replace(/__/g, '_');
    const datestring = Timer.startTime.toISOString().replace(/[T:-]/g, '').replace(/\..+/, '')
    const fsfn = [setting, mediaType.replace(/[^a-zA-Z0-9]/g, '_'), datestring, path, fn].filter(p => p?.length > 0).join('-');
    return fsfn;
  }

  async writeFileBuffer(file: TPathedOrString, content: Buffer) {
    const blobContentType = guessMediaType(actualPath(file));
    const path = isPathed(file) ? actualPath(file) : this.pathed(blobContentType, file);
    const containerClient = await this.getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(path);

    await blockBlobClient.upload(content, Buffer.byteLength(content), { blobHTTPHeaders: { blobContentType } });

    this.getWorld().logger.info(`uploaded ${path}`);
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
