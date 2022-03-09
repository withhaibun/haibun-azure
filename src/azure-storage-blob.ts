import { basename, dirname } from 'path';
import { BlobServiceClient, StorageSharedKeyCredential, ContainerClient } from "@azure/storage-blob";

import { ExternalProperties } from 'sarif';
import { AzureStorage } from './azure-storage';
import { AStepper, CAPTURE, IHasOptions, OK, TNamed, TWorld } from '@haibun/core/build/lib/defs';
import { findStepper, getStepperOption, stringOrError } from '@haibun/core/build/lib/util';

import { ICreateStorageDestination } from "@haibun/domain-storage/build/domain-storage";
import { TINDEX_SUMMARY } from "@haibun/out-review/build/generate-html";
import { AStorage } from "@haibun/domain-storage/build/AStorage";
import { Timer } from '@haibun/core/build/lib/Timer';

const TYPES: { [type: string]: string } = {
  html: 'text/html',
  json: 'json',
  'webm': 'video/mp4'
}

class AzureStorageBlob extends AzureStorage implements ICreateStorageDestination, IHasOptions {
  indexStorage?: AStorage;
  options = {
    ...AzureStorage.prototype.options,
    INDEX_DEST: {
      desc: 'destination for SARIF indexes',
      parse: (input: string) => stringOrError(input)
    }
  }
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
    const indexesDest = getStepperOption(this, 'SUMMARIZE_DEST', world.extraOptions);
    if (indexesDest) {
      this.indexStorage = findStepper(steppers, indexesDest);
    }

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
    indexSarif: {
      gwta: `index the sarif file at {where}`,
      action: async ({ where }: TNamed) => {
        await this.indexSarif(where);
        return OK;
      }
    },
  }
  async indexSarif(loc: string) {
    const contents = await this.readFile(loc, 'utf-8');
    const sarif: ExternalProperties = JSON.parse(contents);
    let results = [];
    for (const result of sarif.results!) {
      const res: TINDEX_SUMMARY = {
        ok: result.level !== 'error',
        title: result.message.text || 'no message',
        path: loc
      }
      results.push(res);
    }
    await this.indexStorage!.writeFile('sarif-index.json', JSON.stringify({ results }));
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