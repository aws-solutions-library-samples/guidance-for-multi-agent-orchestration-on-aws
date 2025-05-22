# Frequently Asked Questions (FAQs)

## Why can't I find the GenAI Labs Bindle?

If you can't find the [GenAI labs](https://bindles.amazon.com/software_app/AWS-GenAI-Labs-Demo) bindle ID, please reach out to your manager so they can add you to the [aws-genai-labs-demo team](https://permissions.amazon.com/a/team/amzn1.abacus.team.qbcf3u7wr4w6jmaqtaka), then try again. It may take up to 24 hours for changes to propagate.

Alternatively, you may ask a fellow team member who is already part of the GenAI labs demo team to create the Isengard account(s) for you then add your alias to the `Admin` console role access list.

## Issue with CodeArtifact Onboarding?

We are currently facing an issue with the onboarding of new accounts and are actively working to resolve this. Please skip this step as of now until we have a workaround!

```txt
Source: Error: Not all members in account [ACCOUNT_NUMBER] are in source-code.
```

## I forgot to copy the Midway client secret key. Now what?

So...you didn't keep the key(s) safe? Don't worry, we got you!

1. Navigate to the Midway [Integration](https://integ.ep.federate.a2z.com/profiles) or [Production](https://ep.federate.a2z.com/profiles) environment for which you are trying to recover the secret key.
2. Under **Service Profiles**, search for then select the **Client ID** with name as your **projectId** in the [project configuration file](../config/project-config.json).
3. Click on the profile **Name** link.
4. Click **Client Secrets** on the side menu.
5. Click **Create New Secret** then copy the secret key. **_Keep it safe_**.
6. Optionally, select the older secret then click **Actions** followed by **Disable**.
7. If propmpted for **Confirmation**, enter `disable` then click **Ok**.

## Can I use a different Git repository, like GitHub?

Yes! You can use a different Git repository, like GitHub.

1. Open [project-config.json](../config/project-config.json) then set **codePipeline** to `false`.
2. Optionally, edit the [pipeline stack](../src/backend/lib/stacks/pipeline.ts) to use your desired source.

## Can I just use the GitLab runner?

Due to GitLab limitations with [Docker in Docker support](https://gitlab.pages.aws.dev/docs/Platform/gitlab-cicd.html#shared-runner-fleet) and native [code replication](https://gitlab.pages.aws.dev/docs/Using%20GitLab/pushing-gitlab-repo-to-codecommit.html), we are using the [AWS Credential Vendor](https://gitlab.pages.aws.dev/docs/Platform/aws-credential-vendor.html) and an IAM role with minimal privileges to cross-authenticate into the dev account with an AWS pipeline to perform CI/CD for dev and prod accounts.

However, you can just use GitLab Runner as your primary CI/CD engine if you are not bound by these limitations.

1. Open [project-config.json](../config/project-config.json) the set **codePipeline** to `false`.
2. From the project's root directory, run `npm run configure`.
3. Replace the existing [.gitlab-ci.yml](../.gitlab-ci.yml) with your own implementation to deploy the code to your target accounts.
