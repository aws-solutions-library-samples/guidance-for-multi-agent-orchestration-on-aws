#!/usr/bin/env node

import { blueBright, bold, greenBright, redBright } from "chalk";
import { writeFileSync } from "fs";
import { AccountConfig, PresetStageType, projectConfig, projectConfigPath } from "../../config";
import {
    banner,
    bye,
    executeCommand,
    getProfileName,
    promptConfirm,
    promptSecret,
    refreshCredentials,
} from "./utils";

const createAdaProfile = async (accountNumber: string, profileName: string) => {
    try {
        await executeCommand(`aws configure get aws_access_key_id --profile=${profileName}`, true);
        console.log(
            greenBright(
                `\nProfile "${profileName}" for account ${accountNumber} already exists.`
            )
        );
    } catch {
        console.log(
            blueBright(`\nSetting up AWS profile "${profileName}" for account ${accountNumber}...`)
        );
        try {
            // Guide user to set up standard AWS credentials instead of using Isengard
            console.log(greenBright(`\nPlease set up AWS credentials for account ${accountNumber}...`));
            await executeCommand(
                `aws configure --profile=${profileName}`
            );
            // Verify the credentials work
            await executeCommand(
                `aws sts get-caller-identity --profile=${profileName}`
            );
            console.log(
                greenBright(`\nSuccessfully set up AWS profile "${profileName}" for account ${accountNumber}!`)
            );
        } catch {
            throw new Error(
                `\nFailed to set up AWS profile "${profileName}" for account ${accountNumber}.`
            );
        }
    }
};

const bootstrapAccount = async (account: AccountConfig, stage: string) => {
    console.log(blueBright(`\nBootstrapping ${stage} account ${account.number}...`));
    try {
        if (stage === PresetStageType.Prod) {
            // enable termination protection & trust dev account
            const devAccountNumber = projectConfig.accounts[PresetStageType.Dev]?.number;
            console.log(
                blueBright(
                    `\nEnabling termination protection for ${stage} account ${account.number} and setting up trust with dev account ${devAccountNumber}...`
                )
            );
            await executeCommand(
                `npm run -w backend cdk bootstrap aws://${account.number}/${account.region} -- ` +
                    `--cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess ` +
                    `--termination-protection --trust ${devAccountNumber} ` +
                    `--profile ${getProfileName(stage)}`
            );
            await executeCommand(
                `npm run -w backend cdk bootstrap aws://${account.number}/us-east-1 -- ` +
                    `--cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess ` +
                    `--termination-protection --trust ${devAccountNumber} ` +
                    `--profile ${getProfileName(stage)}`
            );
        } else {
            await executeCommand(
                `npm run -w backend cdk bootstrap aws://${account.number}/${account.region} -- ` +
                    `--cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess ` +
                    `--profile ${getProfileName(stage)}`
            );
            await executeCommand(
                `npm run -w backend cdk bootstrap aws://${account.number}/us-east-1 -- ` +
                    `--cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess ` +
                    `--profile ${getProfileName(stage)}`
            );
        }
        console.log(greenBright(`\nBootstrapped ${stage} account ${account.number}!`));
    } catch {
        throw new Error(`\nFailed to bootstrap ${stage} account ${account.number}.`);
    }
};

const createMidwaySecret = async (account: AccountConfig, stage: string) => {
    let arnPart = "";
    try {
        const describeSecretResponse = JSON.parse(
            await executeCommand(
                `aws secretsmanager describe-secret --secret-id ${
                    projectConfig.projectId
                }-midway-secret --region ${account.region} --profile=${getProfileName(stage)}`,
                true
            )
        );
        arnPart = describeSecretResponse["ARN"].split("-").pop();
        console.log(
            greenBright(`\nAlready created Midway secret for ${stage} account ${account.number}.`)
        );
    } catch {
        console.log(
            blueBright(`\nCreating Midway secret for ${stage} account ${account.number}...`)
        );
        try {
            let secret = "NONE";
            if (Object.values(PresetStageType).includes(stage as PresetStageType)) {
                do {
                    if (secret !== "NONE" && secret.length < 40) {
                        console.warn(
                            redBright(
                                `\nInvalid Midway secret token. Token length must be at least 40 characters long. Try again...`
                            )
                        );
                    }
                    secret = await promptSecret(
                        `Paste Midway secret token for ${stage} account ${account.number}:`
                    );
                } while (secret.length < 40);
            } else {
                console.log(
                    blueBright(
                        `\nSandbox account detected. Getting Midway secret from dev account...`
                    )
                );
                const getSecretResponse = JSON.parse(
                    await executeCommand(
                        `aws secretsmanager get-secret-value --secret-id ${
                            projectConfig.projectId
                        }-midway-secret --region ${
                            projectConfig.accounts[PresetStageType.Dev].region
                        } --profile=${getProfileName(PresetStageType.Dev)}`,
                        true
                    )
                );
                secret = JSON.parse(getSecretResponse["SecretString"])["clientID"];
            }

            const createSecretResponse = JSON.parse(
                await executeCommand(
                    `aws secretsmanager create-secret --name ${
                        projectConfig.projectId
                    }-midway-secret --region ${
                        account.region
                    } --description "Midway auth secret" --secret-string "{\\"clientID\\":\\"${secret}\\"}" --profile=${getProfileName(
                        stage
                    )}`,
                    true
                )
            );
            arnPart = createSecretResponse["ARN"].split("-").pop();

            console.log(
                greenBright(`\nCreated Midway secret for ${stage} account ${account.number}!`)
            );
        } catch {
            throw new Error(
                `\nFailed to create Midway secret for ${stage} account ${account.number}.`
            );
        }
    }

    projectConfig.accounts[stage] = {
        ...projectConfig.accounts[stage],
        midwaySecretId: arnPart,
    };
    try {
        writeFileSync(projectConfigPath, JSON.stringify(projectConfig, null, 4) + "\n");
        console.log(
            greenBright(
                `\nUpdated Midway secret in config file for ${stage} account ${account.number}!`
            )
        );
    } catch {
        throw new Error(
            `\nFailed to update Midway secret in config file for ${stage} account ${account.number}.`
        );
    }
};

const initializeStage = async (stage: string) => {
    console.log(blueBright(bold(`\nInitializing ${stage} account...`)));

    const account = projectConfig.accounts[stage];
    if (!account) {
        console.error(redBright(`\n🛑 ${stage} account configuration not found.`));
        bye();
    }

    try {
        await createAdaProfile(account.number, getProfileName(stage));

        await bootstrapAccount(account, stage);

        if (projectConfig.midway) {
            await createMidwaySecret(account, stage);
        }

        console.log(greenBright(bold(`\nInitialized ${stage} account!`)));
    } catch (error) {
        console.warn(redBright(error.message));
        console.warn(redBright(bold(`\nFailed to initialize ${stage} account.`)));
    }
};

const main = async () => {
    banner();

    if (
        await (async () => {
            try {
                return !(await promptConfirm(
                    `To start, confirm the project identifier: ${projectConfig.projectId}`
                ));
            } catch {
                return true;
            }
        })()
    ) {
        bye(0);
    }

    await createAdaProfile("010526252695", "code-artifact");

    await refreshCredentials(PresetStageType.Dev);

    for (const stage of Object.keys(projectConfig.accounts)) {
        await initializeStage(stage);
    }

    if (projectConfig.codePipeline) {
        console.log(blueBright("\nDeploying dev pipeline..."));
        try {
            await executeCommand(
                `npm run -w backend cdk deploy -- -e ${
                    projectConfig.projectId
                }-pipeline --profile ${getProfileName(
                    PresetStageType.Dev
                )} -c stage=${PresetStageType.Dev}`
            );
        } catch {
            console.error(redBright("\n🛑 Failed to deploy dev pipeline."));
            bye();
        }
    } else {
        console.log(
            blueBright(
                "\nSkipping dev pipeline deployment. Set `codePipeline` to true in config file to deploy."
            )
        );
    }

    console.log(greenBright(bold("\n✅ Configuration finished!\n")));
};

main();
