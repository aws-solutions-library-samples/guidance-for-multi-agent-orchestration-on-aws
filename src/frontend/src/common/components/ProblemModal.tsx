import { Box, Button, Modal, SpaceBetween, TextContent } from "@cloudscape-design/components";
import { useNavigate } from "react-router-dom";

interface ProblemModalProps {
    headerText: string;
    contentText: string;
}

const ProblemModal = ({ headerText, contentText }: ProblemModalProps) => {
    const navigate = useNavigate();

    const handleReturnHome = () => {
        navigate("/");
    };

    return (
        <Modal
            visible={true}
            header={headerText}
            onDismiss={handleReturnHome}
            footer={
                <Box float="right">
                    <Button variant="primary" onClick={handleReturnHome}>
                        Return Home
                    </Button>
                </Box>
            }
        >
            <SpaceBetween size="l">
                <TextContent>{contentText}</TextContent>
            </SpaceBetween>
        </Modal>
    );
};

export default ProblemModal;
