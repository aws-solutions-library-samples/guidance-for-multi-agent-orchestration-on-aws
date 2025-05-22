import { redBright } from "chalk";
import * as fs from "fs";
import * as path from "path";
import { z } from "zod";

export enum PresetStageType {
    Dev = "dev",
    Prod = "prod",
}

export interface AccountConfig {
    number: string;
    region: string;
    midwaySecretId?: string;
}

interface BaseProjectConfig {
    projectId: string;
    codeArtifact: boolean;
    midway: boolean;
    accounts: {
        [key: string]: AccountConfig;
    };
}
interface ProjectConfigWithPipeline extends BaseProjectConfig {
    codePipeline: true;
    gitlabGroup: string;
    gitlabProject: string;
}
interface ProjectConfigWithoutPipeline extends BaseProjectConfig {
    codePipeline: false;
    gitlabGroup?: string;
    gitlabProject?: string;
}
type ProjectConfig = ProjectConfigWithPipeline | ProjectConfigWithoutPipeline;

export const projectConfigPath = path.join(__dirname, "project-config.json");

const baseSchema = {
    projectId: z
        .string()
        .min(5)
        .max(15)
        .refine((value: string) => !/[ `!@#$%^&*()_+=\\[\]{};':"\\|,.<>\\/?~]/.test(value ?? ""), {
            message: "Name should contain only alphabets except '-' ",
        }),
    codeArtifact: z.boolean(),
    midway: z.boolean(),
    accounts: z.record(
        z.string(),
        z.object({
            number: z.string().length(12),
            region: z.string(),
            midwaySecretId: z.string().optional(),
        })
    ),
};
const gitlabLength = z.string().min(5).max(75);
const configSchema = z.discriminatedUnion("codePipeline", [
    // Schema for projects with pipeline
    z.object({
        ...baseSchema,
        codePipeline: z.literal(true),
        gitlabGroup: gitlabLength,
        gitlabProject: gitlabLength,
    }),
    // Schema for projects without pipeline
    z.object({
        ...baseSchema,
        codePipeline: z.literal(false),
        gitlabGroup: gitlabLength.optional(),
        gitlabProject: gitlabLength.optional(),
    }),
]);

const loadProjectConfig = (): ProjectConfig => {
    let projectConfig: ProjectConfig;
    try {
        projectConfig = JSON.parse(fs.readFileSync(projectConfigPath, "utf-8")) as ProjectConfig;
    } catch {
        console.error(redBright(`\n🛑 Missing project configuration file.\n`));
        process.exit(1);
    }

    const result = configSchema.safeParse(projectConfig);
    if (!result.success) {
        console.error(redBright(`\n🛑 Malformed project configuration file.\n`));
        process.exit(1);
    }

    // if no stage is provided, the app defaults to dev so it must be present
    if (!projectConfig.accounts[PresetStageType.Dev]) {
        console.error(redBright(`\n🛑 Missing dev account in configuration file.\n`));
        process.exit(1);
    }

    return projectConfig;
};

export const projectConfig: ProjectConfig = loadProjectConfig();
