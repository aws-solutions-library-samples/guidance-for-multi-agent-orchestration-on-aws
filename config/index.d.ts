export declare enum PresetStageType {
    Dev = "dev",
    Prod = "prod"
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
export declare const projectConfigPath: string;
export declare const projectConfig: ProjectConfig;
export {};
