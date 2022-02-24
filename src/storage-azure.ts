import { stringOrError } from '@haibun/core/build/lib/util';
import { STORAGE_LOCATION, STORAGE_ITEM } from '@haibun/domain-storage/build/domain-storage';
import { AStorage, } from '@haibun/domain-storage/build/defs';
import { IHasOptions, IRequireDomains } from '@haibun/core/build/lib/defs';

export abstract class StorageAzure extends AStorage implements IHasOptions, IRequireDomains {
    requireDomains = [STORAGE_LOCATION, STORAGE_ITEM];
    options = {
        ACCOUNT_NAME: {
            desc: 'Azure storage account name',
            parse: (input: string) => stringOrError(input)

        },
        ACCOUNT_KEY: {
            desc: 'Azure storage account key',
            parse: (input: string) => stringOrError(input)
        }
    }
}