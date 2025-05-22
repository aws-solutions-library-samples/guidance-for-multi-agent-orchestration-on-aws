import {
    BatchGetBuildsCommand,
    CodeBuildClient,
    StartBuildCommand,
} from "@aws-sdk/client-codebuild";
import {
    CdkCustomResourceEvent,
    CdkCustomResourceIsCompleteEvent,
    CdkCustomResourceIsCompleteResponse,
    CdkCustomResourceResponse,
} from "aws-lambda";

const codeBuildClient = new CodeBuildClient();

export async function onEventHandler(
    event: CdkCustomResourceEvent
): Promise<CdkCustomResourceResponse> {
    switch (event.RequestType) {
        case "Create":
        case "Update": {
            const response = await codeBuildClient.send(
                new StartBuildCommand({
                    projectName: event.ResourceProperties.projectName,
                })
            );
            return {
                Data: {
                    BuildId: response.build?.id,
                },
            };
        }
        case "Delete":
            return {};
    }
}

export async function isCompleteHandler(
    event: CdkCustomResourceIsCompleteEvent
): Promise<CdkCustomResourceIsCompleteResponse> {
    if (event.RequestType === "Delete") {
        return {
            IsComplete: true,
        };
    }

    const response = await codeBuildClient.send(
        new BatchGetBuildsCommand({
            ids: [event.Data?.BuildId],
        })
    );
    const build = response.builds?.[0];
    const buildStatus = build?.buildStatus;
    const isComplete = buildStatus !== "IN_PROGRESS";

    if (isComplete && buildStatus !== "SUCCEEDED") {
        const failedPhase = build?.phases?.find((phase) => phase.phaseStatus !== "SUCCEEDED");
        throw new Error(failedPhase?.contexts?.map((context) => context.message).join("\n"));
    } else {
        return {
            IsComplete: isComplete,
        };
    }
}
