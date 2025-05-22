import ProblemModal from "../common/components/ProblemModal";

const Error = () => {
    return (
        <ProblemModal
            headerText="Page Error"
            contentText="The page has an unexpected error. Please try again or return to the home page."
        />
    );
};

export default Error;
