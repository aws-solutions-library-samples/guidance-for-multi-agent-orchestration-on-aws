import { useAuthenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { Spinner } from "@cloudscape-design/components";
import { I18nProvider } from "@cloudscape-design/components/i18n";
import messages from "@cloudscape-design/components/i18n/messages/all.en";
import "@cloudscape-design/global-styles/index.css";
import { Amplify } from "aws-amplify";
import { fetchAuthSession } from "aws-amplify/auth";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { FlashbarProvider } from "./common/contexts/Flashbar";
import Error from "./pages/Error";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import StreamingTest from "./pages/StreamingTest";
import StreamingTestAlt from "./utilities/streamingComponentTest";
import SimpleStreamingDemo from "./utilities/simpleStreamingComponent";

const LOCALE = "en";

const apiConfig = {
    headers: async () => {
        return {
            Authorization: (await fetchAuthSession()).tokens?.idToken?.toString() ?? "",
        };
    },
};
Amplify.configure(
    {
        Auth: {
            Cognito: {
                userPoolId: import.meta.env.VITE_USER_POOL_ID,
                userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
                identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID,
                allowGuestAccess: false,
            },
        },
        API: {
            GraphQL: {
                endpoint: import.meta.env.VITE_GRAPH_API_URL,
                defaultAuthMode: "userPool",
            },
        },
        Storage: {
            S3: {
                region: import.meta.env.VITE_REGION,
                buckets: {
                    storageBucket: {
                        region: import.meta.env.VITE_REGION,
                        bucketName: import.meta.env.VITE_STORAGE_BUCKET_NAME,
                    },
                },
            },
        },
    },
    {
        API: {
            GraphQL: apiConfig,
        },
    }
);

export default function App() {
    const { authStatus } = useAuthenticator((context) => [context.authStatus]);

    const router = createBrowserRouter([
        {
            path: "*",
            element: <NotFound />,
        },
        {
            path: "/",
            element: <Home />,
            errorElement: <Error />,
        },
        {
            path: "/streaming-test",
            element: <StreamingTest />,
            errorElement: <Error />,
        },
        {
            path: "/streaming-test-alt",
            element: <StreamingTestAlt />,
            errorElement: <Error />,
        },
        {
            path: "/simple-streaming",
            element: <SimpleStreamingDemo />,
            errorElement: <Error />,
        }
    ]);

    // Create a separate router for unauthenticated pages
    const publicRouter = createBrowserRouter([
        {
            path: "/streaming-test",
            element: <StreamingTest />,
            errorElement: <Error />,
        },
        {
            path: "/streaming-test-alt",
            element: <StreamingTestAlt />,
            errorElement: <Error />,
        },
        {
            path: "/simple-streaming",
            element: <SimpleStreamingDemo />,
            errorElement: <Error />,
        },
        {
            path: "*",
            element: <Login />,
        },
    ]);

    return (
        <div>
            {authStatus === "configuring" && <Spinner />}
            {authStatus === "unauthenticated" && (
                <I18nProvider locale={LOCALE} messages={[messages]}>
                    <FlashbarProvider>
                        <RouterProvider router={publicRouter} />
                    </FlashbarProvider>
                </I18nProvider>
            )}
            {authStatus === "authenticated" && (
                <>
                    <I18nProvider locale={LOCALE} messages={[messages]}>
                        <FlashbarProvider>
                            <RouterProvider router={router} />
                        </FlashbarProvider>
                    </I18nProvider>
                </>
            )}
        </div>
    );
}
