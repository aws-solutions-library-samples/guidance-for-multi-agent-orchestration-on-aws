import { useAuthenticator } from "@aws-amplify/ui-react";
import { TopNavigation } from "@cloudscape-design/components";
import { applyMode, Mode } from "@cloudscape-design/global-styles";
import { getCurrentUser } from "aws-amplify/auth";
import { useEffect, useState } from "react";
import Favicon from "./favicon.png";

const APP_NAME = "Multi-agent Collaboration";

interface AuthedUser {
    userName: string;
    userID: string;
}

const TopBar = () => {
    const [theme, setTheme] = useState<Mode>(() => {
        const savedTheme = localStorage.getItem("theme");
        return savedTheme === "dark" ? Mode.Dark : Mode.Light;
    });

    const { user, authStatus, signOut } = useAuthenticator((context) => [context.user]);
    const [authedUser, setAuthedUser] = useState<AuthedUser | null>(null);

    useEffect(() => {
        localStorage.setItem("theme", theme);
        applyMode(theme);
    }, [theme]);

    useEffect(() => {
        const currentAuthenticatedUser = async () => {
            try {
                if (!user) {
                    const { username, userId } = await getCurrentUser();
                    setAuthedUser({
                        userName: username,
                        userID: userId,
                    });
                } else if (user.username.includes("AmazonFederate")) {
                    setAuthedUser({
                        userName: `${user.username.split("_")[1]}@amazon.com`,
                        userID: user.userId,
                    });
                } else if (user.username) {
                    setAuthedUser({
                        userName: user.username,
                        userID: user.userId,
                    });
                } else {
                    setAuthedUser(null);
                }
            } catch (error) {
                console.log(error);
            }
            return null;
        };
        currentAuthenticatedUser();
    }, [authStatus, user]);

    return (
        <div
            style={{
                borderBottom:
                    theme === Mode.Dark
                        ? "2px solid var(--color-border-divider-default-cx07f2)"
                        : "none",
            }}
        >
            <TopNavigation
                identity={{
                    href: "/",
                    title: APP_NAME,
                    logo: {
                        src: Favicon,
                        alt: APP_NAME,
                    },
                }}
                utilities={[
                    {
                        type: "menu-dropdown",
                        iconName: "settings",
                        ariaLabel: "Settings",
                        title: "Settings",
                        onItemClick: ({ detail }) => {
                            if (detail.id === "switch-theme") {
                                setTheme(theme === Mode.Light ? Mode.Dark : Mode.Light);
                            }
                        },
                        items: [
                            {
                                id: "switch-theme",
                                text: theme === Mode.Light ? "🌑  Dark Theme" : "☀️ Light Theme",
                            },
                        ],
                    },
                    {
                        type: "menu-dropdown",
                        text: authedUser?.userName ?? "",
                        iconName: "user-profile",
                        items: [
                            {
                                id: "support-group",
                                text: "Support",
                                items: [
                                    {
                                        id: "documentation",
                                        text: "Documentation",
                                        href: "https://docs.aws.amazon.com/",
                                        external: true,
                                        externalIconAriaLabel: "(opens in new tab)",
                                    },
                                    {
                                        id: "feedback",
                                        text: "Feedback",
                                        href: "https://aws.amazon.com/contact-us/",
                                        external: true,
                                        externalIconAriaLabel: "(opens in new tab)",
                                    },
                                ],
                            },
                            { id: "signout", text: "Sign out" },
                        ],
                        onItemClick: async ({ detail }) => {
                            if (detail.id === "signout") {
                                try {
                                    await signOut();
                                } catch (error) {
                                    console.log("Failed to sign out: ", error);
                                }
                            }
                        },
                    },
                ]}
            />
        </div>
    );
};

export default TopBar;
