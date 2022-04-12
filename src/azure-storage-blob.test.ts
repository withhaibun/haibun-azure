import AzureStorageBlob from "./azure-storage-blob";
import {  getTestWorldWithOptions } from '@haibun/core/build/lib/test/lib';
import { EMediaTypes } from "@haibun/domain-storage";
import { getStepperOptionName } from "@haibun/core/build/lib/util";
import { DEFAULT_DEST } from "@haibun/core/build/lib/defs";

describe('fromCaptureDir', () => {
    it('gets pathed capture dir', async () => {
        const asBlob = new AzureStorageBlob();
        const world = getTestWorldWithOptions({ options: { DEST: DEFAULT_DEST }, extraOptions: { [getStepperOptionName(asBlob, 'ACCOUNT')]: 'foo', [getStepperOptionName(asBlob, 'KEY')]: 'bar' } });
        asBlob.setWorld(world, []);
        const dir = await asBlob.getCaptureLocation({ ...world, mediaType: EMediaTypes.json }, 'test');
        const pathed = asBlob.pathed(EMediaTypes.html, dir);
        expect(pathed).toMatch(/^NO_SETTING-html-\d+-default_loop-0_seq-0_featn-0_mem-0-test$/);
    });
    it('gets pathed capture dir with setting', async () => {
        const asBlob = new AzureStorageBlob();
        const world = getTestWorldWithOptions({ options: { DEST: DEFAULT_DEST, SETTING: 'here' }, extraOptions: { [getStepperOptionName(asBlob, 'ACCOUNT')]: 'foo', [getStepperOptionName(asBlob, 'KEY')]: 'bar' } });
        asBlob.setWorld(world, []);
        const dir = await asBlob.getCaptureLocation({ ...world, mediaType: EMediaTypes.json }, 'test');
        const pathed = asBlob.pathed(EMediaTypes.html, dir);
        expect(pathed).toMatch(/^here-html-\d+-default_loop-0_seq-0_featn-0_mem-0-test$/);
    });
})