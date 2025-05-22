# Developer Machine Setup

These instructions will walk you through properly setting up your Mac, Windows, or Cloud Desktop machine for use with the starter kit.

[TOC]

## mwinit

1. Each day, run the `mwinit` command

    `mwinit -f` on Mac/Windows.

    `winit -o` on Cloud Desktop.

## Builder Toolbox

2. Navigate to [BuilderHub](https://docs.hub.amazon.dev/dev-setup/laptop-or-ws/) then click the link for your machine's **setup**.
3. Follow the instructions on that page to **Install Builder Toolbox**.

## AWS Developer Account (ADA)

We use [ADA](https://w.amazon.com/bin/view/DevAccount/Docs) via the CLI to automate the management of dev, prod, and sandbox account credentials.

4. Use Builder Toolbox to install ADA by running the command `toolbox install ada`.
5. To confirm the installation, run the command `ada`.
    - You should see information on usage, available commands, flags, etc.

## Node Package Manager (NPM) Audit

NPM packages can contain security vulnerabilities and require frequent auditing. However, the official `npm audit`command **_should never be used at Amazon_**.

6. Use Builder Toolbox to install the approved tool `npm-eevee-audit` by running the command `toolbox install npm-eevee-audit`.

## Volta/Node.js

[Volta](https://volta.sh/) can manage several versions of Node.js on your developer machine so you can seamlessly switch versions based on your demo needs.

7. Install Volta using these [instructions](https://docs.volta.sh/guide/getting-started).
8. Run the command `volta install node@22` to install Node.js.

    - You may also use Node Version Manager (NVM).

    - Make sure you install the same version of Node specified in the [package.json](../package.json).

        ```json
        "engines": {
            "node": "22.8.0"
        },
        ```

9. Ensure you do not have other global NodeJS installations from HomeBrew (Mac) or a standalone Node.js exe (Windows).
10. Optionally, you can run the command `volta install npm@bundled`to get the latest NPM with your Node.js version.

## Python

We highly recommend setting up a Python version manager so you can seamlessly switch versions based on your demo needs.

### Mac/Cloud Desktop

11. Install `pyenv` from [here](https://github.com/pyenv/pyenv?tab=readme-ov-file#installation).

### Windows

11. Install the `pyenv-win` fork from [here](https://github.com/pyenv-win/pyenv-win).

### Install

12. After installing `pyenv` or `pyenv-win`, run the command `pyenv install 3.12.5` to install Python.
    - Make sure you install the same version of Python specified in [.python-version](../.python-version).
    - We have included this `.python-version` file so the starter kit uses the same version of Python across its users.
13. If you have a global Python version configured via `pyenv`, then we recommend that you match the global version to the starter kit's version. Read more on setting global and local versions [here](https://realpython.com/intro-to-pyenv/#specifying-your-python-version).

## AWS CLI

14. Verify if you have v2 of the AWS CLI by running the command `aws --version`.
    - Unistall v1 if necessary.
15. Set up AWS CLI following the instructions [here](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html).

## Git

16. If you are a Windows user, follow these [instructions](https://github.com/git-guides/install-git).
    - Mac and Cloud Desktop users should have Git pre-installed.
    - You can verify Git installation by running the command `git -h`.
17. Run the following commands to create a global Git user:

```bash
git config --global user.email "[YOUR_ALIAS]@amazon.com" && git config --global user.name "[YOUR NAME]"
```

18. Run the following command to store/persist your details in the Git credentials store:

```bash
git config credential.helper store
```

## Visual Studio Code

19. Optionally, install Visual Studio Code from Amazon Self Service.

## Docker

### Docker Desktop

20. If you are a Mac or Windows user, install the Docker Desktop application from [here](https://www.docker.com/).
    - The Docker CLI is pre-installed for Cloud Desktop users.

- **_Do not sign in/up in Docker Desktop_** or ACME will automatically uninstall it. Read more [here](https://docs.hub.amazon.dev/containers/docker/#docker-desktop).

### Docker Engine

Docker is known to consume a lot of disk space and doesn't auto remove older images & accrues a lot of logs by default. Mac and Windows users can use the below configuration to save precious disk space.

21. If you are a Mac or Windows user, open Docker Desktop.
22. Click on the gear icon ⚙️ in top right corner.
23. Select **Docker Engine** on the left side then copy & paste the following configuration:

    ```json
    {
        "builder": {
            "gc": {
                "defaultKeepStorage": "20GB",
                "enabled": true
            }
        },
        "experimental": false,
        "log-driver": "json-file",
        "log-format": "text",
        "log-level": "info",
        "log-opts": {
            "cache-compress": "true",
            "cache-disabled": "false",
            "cache-max-file": "5",
            "cache-max-size": "20m",
            "env": "os,customer",
            "labels": "somelabel",
            "max-file": "5",
            "max-size": "10m"
        },
        "max-concurrent-downloads": 1
    }
    ```

24. Click **Apply & restart**

## Amazon Q Developer

25. Follow these [instructions](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/command-line-installing.html) to install Amazon Q for command line.
26. Follow these [instructions](https://docs.hub.amazon.dev/qdeveloper/user-guide/getting-started/) to set up Amazon Q Developer internally.
