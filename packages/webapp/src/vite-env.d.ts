/// <reference types="vite/client" />

interface ImportMeta {
  readonly env: {
    readonly VITE_CONFIG_COGNITO_USERPOOL_ID: string;
    readonly VITE_CONFIG_COGNITO_APPCLIENT_ID: string;
    readonly VITE_CONFIG_COGNITO_IDENTITYPOOL_ID: string;
    readonly VITE_CONFIG_COGNITO_DOMAIN: string;
    readonly VITE_CONFIG_COGNITO_CALLBACK_URL: string;
    readonly VITE_CONFIG_HTTP_API_URL: string;
    readonly VITE_CONFIG_REST_API_URL: string;
    readonly VITE_REGION: string;
    readonly VITE_CONFIG_S3_DATA_BUCKET_NAME: string;
    readonly [key: string]: string;
  };
}