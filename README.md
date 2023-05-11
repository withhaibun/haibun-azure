
This extension provides a [Haibun](https://github.com/withhaibun/) extension that implements the storage interface for Azure. It can address files and blobs.

## Example pipeline

Following is an example pipeline to use Haibun tests in your repository, 
with annotations. 
This pipeline will run a sample pipeline, 
then generate an interactive review of the result.

```yaml
jobs:
  - job: e2etests

    container:
        image: mcr.microsoft.com/playwright:focal
        volumes: [e2e-reviews]

    steps:
        # - checkout: e2etest     
        - task: Npm@1
          inputs:
            command: 'install'
          displayName: 'installing dependencies'
# uses CmdLine for the following instead of Npm because npm buffers the entire output
        - task: CmdLine@2
          displayName: 'make junit test directory'
          continueOnError: false
          inputs:
            script: |
              mkdir junit

        - task: CmdLine@2 
          displayName: 'Running path e2e tests'
          continueOnError: true
          inputs:
            script: |
              npm run test-pr-happy

        - task: CmdLine@2
          displayName: 'Generate test result indexes'
          continueOnError: true
          inputs:
            script: |
              npm run publish-azure-captures-indexes

        - task: PublishTestResults@2
          inputs:
            testResultsFormat: 'JUnit'
            testResultsFiles: 'junit/**.xml'
```

For this pipeline, the following are defined:

_O_AZURESTORAGEBLOB_ACCOUNT: An Azure Blob storage storage account.

_O_AZURESTORAGEBLOB_DESTINATION: A container to use as stoarge.

_O_AZURESTORAGEBLOB_KEY: The key for the container.

_O_OUTREVIEWS_URI_ARGS: Append this value to any review links that require an [SAS key](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview). (This is a querystring in the format ?sp=…)

The pipeline uses this scripts from package.json:

```javascript
    "test-pr-happy":       "HAIBUN_OUTPUT_DEST=junit/pr-happy.xml haibun-cli $PR_HAPPY",
    "publish-azure-captures-indexes": "HAIBUN_O_OUTREVIEWS_TRACE_STORAGE=StorageFS HAIBUN_O_OUTREVIEWS_PUBLISH_STORAGE=AzureStorageBlob HAIBUN_O_OUTREVIEWS_INDEX_STORAGE=StorageFS HAIBUN_O_OUTREVIEWS_REVIEWS_STORAGE=AzureStorageBlob HAIBUN_O_AZURESTORAGEBLOB_DESTINATION=${_O_AZURESTORAGEBLOB_DESTINATION} HAIBUN_O_AZURESTORAGEBLOB_ACCOUNT=${_O_AZURESTORAGEBLOB_ACCOUNT} HAIBUN_O_AZURESTORAGEBLOB_KEY=${_O_AZURESTORAGEBLOB_KEY} HAIBUN_O_OUTREVIEWS_URI_ARGS=${_O_OUTREVIEWS_URI_ARGS} haibun-cli --config publish/azure publish",
  ```

  This will run the end to end test, then generate an interactive review, which can be found in the file or container storage objects.

The following is the equivilent for local reviews;
`    "publish-local-captures-indexes": "HAIBUN_O_OUTREVIEWS_TRACE_STORAGE=StorageFS HAIBUN_O_OUTREVIEWS_PUBLISH_STORAGE=StorageFS HAIBUN_O_OUTREVIEWS_INDEX_STORAGE=StorageFS HAIBUN_O_OUTREVIEWS_REVIEWS_STORAGE=StorageFS haibun-cli --config publish/local publish",`

## Strategies

`HAIBUN_SETTING` can be used to add a preview to reviews, for example, 'test'. This prefix can be used in storage account [lifecycle management](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-configure?tabs=azure-portal) using different stategies; for example, one month for builds, six months for tests, and one year for deployments.



