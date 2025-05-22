import { Authenticator } from "@aws-amplify/ui-react";

const Login = () => {
    return (
        <Authenticator
            hideSignUp={true}
            variation="modal"
        />
    );
};

export default Login;
