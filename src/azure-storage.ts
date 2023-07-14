import { AStepper, IHasOptions, TWorld } from "@haibun/core/build/lib/defs.js";
import { boolOrError, getStepperOption, stringOrError } from "@haibun/core/build/lib/util/index.js";
import { AStorage } from "@haibun/domain-storage/build/AStorage.js";

export const STRICT_PATH = 'STRICT_PATH';

export type TStorageEnv = {
  account: string,
  accountKey: string,
  destination: string
}

export abstract class AzureStorage extends AStorage implements IHasOptions {
  options = {
    DESTINATION: {
      required: true,
      desc: 'Storage destination',
      parse: (input: string) => stringOrError(input)
    },
    ACCOUNT: {
      required: true,
      desc: 'Azure account',
      parse: (input: string) => stringOrError(input)
    },
    KEY: {
      required: true,
      desc: 'Azure account key',
      parse: (input: string) => stringOrError(input)
    },
    [STRICT_PATH]: {
      desc: 'Don\'t change paths',
      parse: (input: string) => boolOrError(input)
    }
  };
  destination?: string;
  setWorld(world: TWorld, steppers: AStepper[]) {
    super.setWorld(world, steppers);
    this.destination = getStepperOption(this, 'DESTINATION', world.extraOptions);
  }

  ensureCaptureDir = super.ensureCaptureLocation
}