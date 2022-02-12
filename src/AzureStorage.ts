export type TStorageEnv = {
  account: string,
  accountKey: string,
  defaultContainer: string
}

export abstract class AzureStorage {
  containerName: string;

  constructor({ account, accountKey, defaultContainer }: TStorageEnv) {
    this.containerName = defaultContainer;
  }
  abstract readdir(): Promise<any>;
  abstract writeFile(fileName: string, content: Buffer): Promise<void>;

  abstract copyLocalDirectory(source: string): Promise<void>;

  abstract startCopy(source: string): Promise<void>

  static getEnv(env: { [name: string]: string | undefined }) {
    const account = process.env.ACCOUNT_NAME;
    const accountKey = process.env.ACCOUNT_KEY;
    const defaultContainer = process.env.DEFAULT_CONTAINER;

    if (!account || !accountKey || !defaultContainer) {
      throw Error('missing env arg');
    }
    return { account, accountKey, defaultContainer };
  }
}