import ProblemModal from "../common/components/ProblemModal";

const NotFound = () => {
    return (
        <ProblemModal
            headerText="Page Not Found"
            contentText="The page you requested could not be found. Please check the URL or return to the home page."
        />
    );
};

export default NotFound;
