import "@aws-amplify/ui-react/styles.css";
import { AppLayout, AppLayoutProps, Flashbar } from "@cloudscape-design/components";
import "@cloudscape-design/global-styles/index.css";
import { useContext } from "react";
import { FlashbarContext } from "../../contexts/Flashbar";
import TopBar from "./TopBar";

const Layout = (props: AppLayoutProps) => {
    const { flashbarItems, removeFlashbarItem } = useContext(FlashbarContext);

    return (
        <>
            <TopBar />
            <AppLayout
                navigationHide
                notifications={
                    <Flashbar
                        items={flashbarItems.map((item, index) => ({
                            type: item.type,
                            dismissible: true,
                            dismissLabel: "Dismiss",
                            onDismiss: () => removeFlashbarItem(index),
                            content: item.content,
                        }))}
                        // stackItems
                    />
                }
                stickyNotifications
                toolsHide={true}
                {...props}
            />
        </>
    );
};

export default Layout;
