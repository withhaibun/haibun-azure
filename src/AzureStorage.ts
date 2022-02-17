export type TStorageEnv = {
  account: string,
  accountKey: string,
  destination: string
}

export abstract class AzureStorage {
  destination: string;

  constructor({ account, accountKey, destination }: TStorageEnv) {
    this.destination = destination;
  }
  abstract readdir(): Promise<any>;
  abstract writeFile(fileName: string, content: Buffer): Promise<void>;

  abstract copyLocalDirectory(source: string): Promise<void>;

  static getEnv(env: { [name: string]: string | undefined }) {
    const account = process.env.ACCOUNT_NAME;
    const accountKey = process.env.ACCOUNT_KEY;
    const destination = process.env.DEFAULT_CONTAINER;

    if (!account || !accountKey || !destination) {
      throw Error('missing env arg');
    }

    return { account, accountKey, destination };
  }
}