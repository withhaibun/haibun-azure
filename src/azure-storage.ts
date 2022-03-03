import { AStepper, IHasOptions, TWorld } from "@haibun/core/build/lib/defs";
import { getStepperOption, stringOrError } from "@haibun/core/build/lib/util";
import { AStorage } from "@haibun/domain-storage/build/AStorage";

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
  };
  destination?: string;
  setWorld(world: TWorld, steppers: AStepper[]) {
    super.setWorld(world, steppers);
    this.destination = getStepperOption(this, 'DESTINATION', world.extraOptions);
  }

  ensureCaptureDir = super.ensureCaptureDir
}