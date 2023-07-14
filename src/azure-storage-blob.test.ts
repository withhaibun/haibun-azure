import AzureStorageBlob from "./azure-storage-blob.js";
import { getTestWorldWithOptions } from '@haibun/core/build/lib/test/lib.js';
import { getStepperOptionName } from "@haibun/core/build/lib/util/index.js";
import { DEFAULT_DEST } from "@haibun/core/build/lib/defs.js";
import { EMediaTypes } from "@haibun/domain-storage/build/domain-storage.js";

describe('fromCaptureDir', () => {
    it('gets pathed capture dir', async () => {
        const asBlob = new AzureStorageBlob();
        const world = getTestWorldWithOptions({ options: { DEST: DEFAULT_DEST }, extraOptions: { [getStepperOptionName(asBlob, 'ACCOUNT')]: 'foo', [getStepperOptionName(asBlob, 'KEY')]: 'bar' } });
        asBlob.setWorld(world, []);
        const dir = await asBlob.getCaptureLocation({ ...world, mediaType: EMediaTypes.json }, 'test');
        const pathed = asBlob.pathed(EMediaTypes.html, dir);
        expect(pathed).toMatch(/^html-\d+-default_\d+_loop-0_seq-0_featn-0_mem-0-test$/);
    });
    it('gets pathed capture dir with setting', async () => {
        const asBlob = new AzureStorageBlob();
        const world = getTestWorldWithOptions({ options: { DEST: DEFAULT_DEST, SETTING: 'here' }, extraOptions: { [getStepperOptionName(asBlob, 'ACCOUNT')]: 'foo', [getStepperOptionName(asBlob, 'KEY')]: 'bar' } });
        asBlob.setWorld(world, []);
        const dir = await asBlob.getCaptureLocation({ ...world, mediaType: EMediaTypes.json }, 'test');
        const pathed = asBlob.pathed(EMediaTypes.html, dir);
        expect(pathed).toMatch(/^here-html-\d+-default_\d+_loop-0_seq-0_featn-0_mem-0-test$/);
    });
})