# Cognito User Creation

To show demos on non-AWS employee machines, such as re:Invent kiosks, we can use an email and password to authenticate users through Amazon Cognito.

Follow these steps to create an Amazon Cognito user for dev, prod, or sandbox accounts:

1. Open the [Cognito console](https://console.aws.amazon.com/cognito/v2/idp/user-pools?) then click on the appropriate **User pool name**.
2. In the menu, click **Users**, then click **Create user**.
3. Create a user as shown below:

    ![kiosk-user](./images/cognito-kiosk-user.png)

    - Ensure you adhere to the password policy.

4. On your frontend application's login page, enter the same email and password, then follow the on-screen instructions.

    ![react-login](./images/react-login.png)

- You can use the **Reset Password** option to set a new password for the user if needed.
