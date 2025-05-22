"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectConfig = exports.projectConfigPath = exports.PresetStageType = void 0;
const chalk_1 = require("chalk");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const zod_1 = require("zod");
var PresetStageType;
(function (PresetStageType) {
    PresetStageType["Dev"] = "dev";
    PresetStageType["Prod"] = "prod";
})(PresetStageType || (exports.PresetStageType = PresetStageType = {}));
exports.projectConfigPath = path.join(__dirname, "project-config.json");
const baseSchema = {
    projectId: zod_1.z
        .string()
        .min(5)
        .max(15)
        .refine((value) => !/[ `!@#$%^&*()_+=\\[\]{};':"\\|,.<>\\/?~]/.test(value ?? ""), {
        message: "Name should contain only alphabets except '-' ",
    }),
    codeArtifact: zod_1.z.boolean(),
    midway: zod_1.z.boolean(),
    accounts: zod_1.z.record(zod_1.z.string(), zod_1.z.object({
        number: zod_1.z.string().length(12),
        region: zod_1.z.string(),
        midwaySecretId: zod_1.z.string().optional(),
    })),
};
const gitlabLength = zod_1.z.string().min(5).max(75);
const configSchema = zod_1.z.discriminatedUnion("codePipeline", [
    // Schema for projects with pipeline
    zod_1.z.object({
        ...baseSchema,
        codePipeline: zod_1.z.literal(true),
        gitlabGroup: gitlabLength,
        gitlabProject: gitlabLength,
    }),
    // Schema for projects without pipeline
    zod_1.z.object({
        ...baseSchema,
        codePipeline: zod_1.z.literal(false),
        gitlabGroup: gitlabLength.optional(),
        gitlabProject: gitlabLength.optional(),
    }),
]);
const loadProjectConfig = () => {
    let projectConfig;
    try {
        projectConfig = JSON.parse(fs.readFileSync(exports.projectConfigPath, "utf-8"));
    }
    catch {
        console.error((0, chalk_1.redBright)(`\n🛑 Missing project configuration file.\n`));
        process.exit(1);
    }
    const result = configSchema.safeParse(projectConfig);
    if (!result.success) {
        console.error((0, chalk_1.redBright)(`\n🛑 Malformed project configuration file.\n`));
        process.exit(1);
    }
    // if no stage is provided, the app defaults to dev so it must be present
    if (!projectConfig.accounts[PresetStageType.Dev]) {
        console.error((0, chalk_1.redBright)(`\n🛑 Missing dev account in configuration file.\n`));
        process.exit(1);
    }
    return projectConfig;
};
exports.projectConfig = loadProjectConfig();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlDQUFrQztBQUNsQyx1Q0FBeUI7QUFDekIsMkNBQTZCO0FBQzdCLDZCQUF3QjtBQUV4QixJQUFZLGVBR1g7QUFIRCxXQUFZLGVBQWU7SUFDdkIsOEJBQVcsQ0FBQTtJQUNYLGdDQUFhLENBQUE7QUFDakIsQ0FBQyxFQUhXLGVBQWUsK0JBQWYsZUFBZSxRQUcxQjtBQTRCWSxRQUFBLGlCQUFpQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLHFCQUFxQixDQUFDLENBQUM7QUFFN0UsTUFBTSxVQUFVLEdBQUc7SUFDZixTQUFTLEVBQUUsT0FBQztTQUNQLE1BQU0sRUFBRTtTQUNSLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDTixHQUFHLENBQUMsRUFBRSxDQUFDO1NBQ1AsTUFBTSxDQUFDLENBQUMsS0FBYSxFQUFFLEVBQUUsQ0FBQyxDQUFDLDBDQUEwQyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDLEVBQUU7UUFDdEYsT0FBTyxFQUFFLGdEQUFnRDtLQUM1RCxDQUFDO0lBQ04sWUFBWSxFQUFFLE9BQUMsQ0FBQyxPQUFPLEVBQUU7SUFDekIsTUFBTSxFQUFFLE9BQUMsQ0FBQyxPQUFPLEVBQUU7SUFDbkIsUUFBUSxFQUFFLE9BQUMsQ0FBQyxNQUFNLENBQ2QsT0FBQyxDQUFDLE1BQU0sRUFBRSxFQUNWLE9BQUMsQ0FBQyxNQUFNLENBQUM7UUFDTCxNQUFNLEVBQUUsT0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7UUFDN0IsTUFBTSxFQUFFLE9BQUMsQ0FBQyxNQUFNLEVBQUU7UUFDbEIsY0FBYyxFQUFFLE9BQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUU7S0FDeEMsQ0FBQyxDQUNMO0NBQ0osQ0FBQztBQUNGLE1BQU0sWUFBWSxHQUFHLE9BQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQy9DLE1BQU0sWUFBWSxHQUFHLE9BQUMsQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUU7SUFDdEQsb0NBQW9DO0lBQ3BDLE9BQUMsQ0FBQyxNQUFNLENBQUM7UUFDTCxHQUFHLFVBQVU7UUFDYixZQUFZLEVBQUUsT0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7UUFDN0IsV0FBVyxFQUFFLFlBQVk7UUFDekIsYUFBYSxFQUFFLFlBQVk7S0FDOUIsQ0FBQztJQUNGLHVDQUF1QztJQUN2QyxPQUFDLENBQUMsTUFBTSxDQUFDO1FBQ0wsR0FBRyxVQUFVO1FBQ2IsWUFBWSxFQUFFLE9BQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO1FBQzlCLFdBQVcsRUFBRSxZQUFZLENBQUMsUUFBUSxFQUFFO1FBQ3BDLGFBQWEsRUFBRSxZQUFZLENBQUMsUUFBUSxFQUFFO0tBQ3pDLENBQUM7Q0FDTCxDQUFDLENBQUM7QUFFSCxNQUFNLGlCQUFpQixHQUFHLEdBQWtCLEVBQUU7SUFDMUMsSUFBSSxhQUE0QixDQUFDO0lBQ2pDLElBQUksQ0FBQztRQUNELGFBQWEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMseUJBQWlCLEVBQUUsT0FBTyxDQUFDLENBQWtCLENBQUM7SUFDN0YsQ0FBQztJQUFDLE1BQU0sQ0FBQztRQUNMLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBQSxpQkFBUyxFQUFDLDRDQUE0QyxDQUFDLENBQUMsQ0FBQztRQUN2RSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLENBQUM7SUFFRCxNQUFNLE1BQU0sR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3JELElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFBLGlCQUFTLEVBQUMsOENBQThDLENBQUMsQ0FBQyxDQUFDO1FBQ3pFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsQ0FBQztJQUVELHlFQUF5RTtJQUN6RSxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUMvQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUEsaUJBQVMsRUFBQyxtREFBbUQsQ0FBQyxDQUFDLENBQUM7UUFDOUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixDQUFDO0lBRUQsT0FBTyxhQUFhLENBQUM7QUFDekIsQ0FBQyxDQUFDO0FBRVcsUUFBQSxhQUFhLEdBQWtCLGlCQUFpQixFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyByZWRCcmlnaHQgfSBmcm9tIFwiY2hhbGtcIjtcbmltcG9ydCAqIGFzIGZzIGZyb20gXCJmc1wiO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgeiB9IGZyb20gXCJ6b2RcIjtcblxuZXhwb3J0IGVudW0gUHJlc2V0U3RhZ2VUeXBlIHtcbiAgICBEZXYgPSBcImRldlwiLFxuICAgIFByb2QgPSBcInByb2RcIixcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBY2NvdW50Q29uZmlnIHtcbiAgICBudW1iZXI6IHN0cmluZztcbiAgICByZWdpb246IHN0cmluZztcbiAgICBtaWR3YXlTZWNyZXRJZD86IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIEJhc2VQcm9qZWN0Q29uZmlnIHtcbiAgICBwcm9qZWN0SWQ6IHN0cmluZztcbiAgICBjb2RlQXJ0aWZhY3Q6IGJvb2xlYW47XG4gICAgbWlkd2F5OiBib29sZWFuO1xuICAgIGFjY291bnRzOiB7XG4gICAgICAgIFtrZXk6IHN0cmluZ106IEFjY291bnRDb25maWc7XG4gICAgfTtcbn1cbmludGVyZmFjZSBQcm9qZWN0Q29uZmlnV2l0aFBpcGVsaW5lIGV4dGVuZHMgQmFzZVByb2plY3RDb25maWcge1xuICAgIGNvZGVQaXBlbGluZTogdHJ1ZTtcbiAgICBnaXRsYWJHcm91cDogc3RyaW5nO1xuICAgIGdpdGxhYlByb2plY3Q6IHN0cmluZztcbn1cbmludGVyZmFjZSBQcm9qZWN0Q29uZmlnV2l0aG91dFBpcGVsaW5lIGV4dGVuZHMgQmFzZVByb2plY3RDb25maWcge1xuICAgIGNvZGVQaXBlbGluZTogZmFsc2U7XG4gICAgZ2l0bGFiR3JvdXA/OiBzdHJpbmc7XG4gICAgZ2l0bGFiUHJvamVjdD86IHN0cmluZztcbn1cbnR5cGUgUHJvamVjdENvbmZpZyA9IFByb2plY3RDb25maWdXaXRoUGlwZWxpbmUgfCBQcm9qZWN0Q29uZmlnV2l0aG91dFBpcGVsaW5lO1xuXG5leHBvcnQgY29uc3QgcHJvamVjdENvbmZpZ1BhdGggPSBwYXRoLmpvaW4oX19kaXJuYW1lLCBcInByb2plY3QtY29uZmlnLmpzb25cIik7XG5cbmNvbnN0IGJhc2VTY2hlbWEgPSB7XG4gICAgcHJvamVjdElkOiB6XG4gICAgICAgIC5zdHJpbmcoKVxuICAgICAgICAubWluKDUpXG4gICAgICAgIC5tYXgoMTUpXG4gICAgICAgIC5yZWZpbmUoKHZhbHVlOiBzdHJpbmcpID0+ICEvWyBgIUAjJCVeJiooKV8rPVxcXFxbXFxde307JzpcIlxcXFx8LC48PlxcXFwvP35dLy50ZXN0KHZhbHVlID8/IFwiXCIpLCB7XG4gICAgICAgICAgICBtZXNzYWdlOiBcIk5hbWUgc2hvdWxkIGNvbnRhaW4gb25seSBhbHBoYWJldHMgZXhjZXB0ICctJyBcIixcbiAgICAgICAgfSksXG4gICAgY29kZUFydGlmYWN0OiB6LmJvb2xlYW4oKSxcbiAgICBtaWR3YXk6IHouYm9vbGVhbigpLFxuICAgIGFjY291bnRzOiB6LnJlY29yZChcbiAgICAgICAgei5zdHJpbmcoKSxcbiAgICAgICAgei5vYmplY3Qoe1xuICAgICAgICAgICAgbnVtYmVyOiB6LnN0cmluZygpLmxlbmd0aCgxMiksXG4gICAgICAgICAgICByZWdpb246IHouc3RyaW5nKCksXG4gICAgICAgICAgICBtaWR3YXlTZWNyZXRJZDogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICAgICAgICB9KVxuICAgICksXG59O1xuY29uc3QgZ2l0bGFiTGVuZ3RoID0gei5zdHJpbmcoKS5taW4oNSkubWF4KDc1KTtcbmNvbnN0IGNvbmZpZ1NjaGVtYSA9IHouZGlzY3JpbWluYXRlZFVuaW9uKFwiY29kZVBpcGVsaW5lXCIsIFtcbiAgICAvLyBTY2hlbWEgZm9yIHByb2plY3RzIHdpdGggcGlwZWxpbmVcbiAgICB6Lm9iamVjdCh7XG4gICAgICAgIC4uLmJhc2VTY2hlbWEsXG4gICAgICAgIGNvZGVQaXBlbGluZTogei5saXRlcmFsKHRydWUpLFxuICAgICAgICBnaXRsYWJHcm91cDogZ2l0bGFiTGVuZ3RoLFxuICAgICAgICBnaXRsYWJQcm9qZWN0OiBnaXRsYWJMZW5ndGgsXG4gICAgfSksXG4gICAgLy8gU2NoZW1hIGZvciBwcm9qZWN0cyB3aXRob3V0IHBpcGVsaW5lXG4gICAgei5vYmplY3Qoe1xuICAgICAgICAuLi5iYXNlU2NoZW1hLFxuICAgICAgICBjb2RlUGlwZWxpbmU6IHoubGl0ZXJhbChmYWxzZSksXG4gICAgICAgIGdpdGxhYkdyb3VwOiBnaXRsYWJMZW5ndGgub3B0aW9uYWwoKSxcbiAgICAgICAgZ2l0bGFiUHJvamVjdDogZ2l0bGFiTGVuZ3RoLm9wdGlvbmFsKCksXG4gICAgfSksXG5dKTtcblxuY29uc3QgbG9hZFByb2plY3RDb25maWcgPSAoKTogUHJvamVjdENvbmZpZyA9PiB7XG4gICAgbGV0IHByb2plY3RDb25maWc6IFByb2plY3RDb25maWc7XG4gICAgdHJ5IHtcbiAgICAgICAgcHJvamVjdENvbmZpZyA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHByb2plY3RDb25maWdQYXRoLCBcInV0Zi04XCIpKSBhcyBQcm9qZWN0Q29uZmlnO1xuICAgIH0gY2F0Y2gge1xuICAgICAgICBjb25zb2xlLmVycm9yKHJlZEJyaWdodChgXFxu8J+bkSBNaXNzaW5nIHByb2plY3QgY29uZmlndXJhdGlvbiBmaWxlLlxcbmApKTtcbiAgICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3VsdCA9IGNvbmZpZ1NjaGVtYS5zYWZlUGFyc2UocHJvamVjdENvbmZpZyk7XG4gICAgaWYgKCFyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICBjb25zb2xlLmVycm9yKHJlZEJyaWdodChgXFxu8J+bkSBNYWxmb3JtZWQgcHJvamVjdCBjb25maWd1cmF0aW9uIGZpbGUuXFxuYCkpO1xuICAgICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgfVxuXG4gICAgLy8gaWYgbm8gc3RhZ2UgaXMgcHJvdmlkZWQsIHRoZSBhcHAgZGVmYXVsdHMgdG8gZGV2IHNvIGl0IG11c3QgYmUgcHJlc2VudFxuICAgIGlmICghcHJvamVjdENvbmZpZy5hY2NvdW50c1tQcmVzZXRTdGFnZVR5cGUuRGV2XSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKHJlZEJyaWdodChgXFxu8J+bkSBNaXNzaW5nIGRldiBhY2NvdW50IGluIGNvbmZpZ3VyYXRpb24gZmlsZS5cXG5gKSk7XG4gICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcHJvamVjdENvbmZpZztcbn07XG5cbmV4cG9ydCBjb25zdCBwcm9qZWN0Q29uZmlnOiBQcm9qZWN0Q29uZmlnID0gbG9hZFByb2plY3RDb25maWcoKTtcbiJdfQ==