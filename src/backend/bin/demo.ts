import { App } from "aws-cdk-lib";
import { PresetStageType, projectConfig } from "../../../config";
import { PipelineStack } from "../lib/stacks/pipeline";
import { ApplicationStage } from "../lib/stage";

const app = new App({
    context: {
        stackPrefix: projectConfig.projectId,
    },
});
const stage = app.node.tryGetContext("stage") || PresetStageType.Dev;
const account = projectConfig.accounts[stage];
const properties = {
    env: {
        account: account.number,
        region: account.region,
    },
};

if (projectConfig.codePipeline && stage === PresetStageType.Dev) {
    // this stack must be named pipeline
    new PipelineStack(app, "pipeline", properties);
} else {
    new ApplicationStage(app, stage, properties);
}
app.synth();
