import { Tabs } from "@cloudscape-design/components";
import Layout from "../../common/components/Layout";
import Chat from "./Chat";
import DataTabs from "./Data";

const Home = () => {
    return (
        <Layout
            content={
                <Tabs
                    tabs={[
                        {
                            label: "Chat",
                            id: "chat",
                            content: <Chat />,
                        },
                        {
                            label: "Data",
                            id: "data",
                            content: <DataTabs />,
                        },
                    ]}
                />
            }
        />
    );
};

export default Home;
