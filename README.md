# Tomson - A Collection of TypeScript Libraries

Welcome to the Tomson monorepo! This project is a curated collection of high-quality, pure TypeScript packages designed to be robust, lightweight, and easy to integrate into any project. Our goal is to provide useful utilities and libraries that solve common problems with minimal third-party dependencies.

## Philosophy

Each library within this monorepo is built with a core principle: **independence**. We strive to keep third-party dependencies to an absolute minimum. This results in smaller bundle sizes, fewer potential security vulnerabilities, and a more stable and predictable codebase for you to rely on.

## What's Inside?

This repository is continuously evolving. Here are the packages currently available:

| Package                                                     | Description                                                                                                            |
| :---------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| [`@tomson/queue-manager`](./packages/queue-manager)         | A powerful and flexible queue manager for handling asynchronous tasks with concurrency, retries, and prioritization.     |
| [`@tomson/react-queue-manager`](./packages/react/queue-manager) | Official React bindings for `@tomson/queue-manager`, providing hooks and a provider for seamless integration.        |
| [`@tomson/concrete-tasks`](./packages/concrete-tasks)       | A set of pre-built, concrete task implementations (like `FileUploadTask`) to speed up integration with the queue manager. |

## Roadmap & Contributing

This project is just getting started, and we have big plans! Our immediate roadmap includes creating bindings for other popular frameworks and libraries.

- [ ] Vue.js Bindings
- [ ] Svelte Bindings
- [ ] Angular Bindings
- [ ] More concrete task implementations

**We are actively looking for volunteers!** If you're passionate about open-source, TypeScript, and building high-quality libraries, we would love your help to speed up development and bring more features to life. Your contributions, big or small, are incredibly valuable.

## Community & Guidelines

We want to foster a welcoming and inclusive community. Please read our community guidelines before contributing.

- **[Contributing Guide](./CONTRIBUTING.md)**: Learn how to set up the project, our coding standards, and how to submit pull requests.
- **[Code of Conduct](./CODE_OF_CONDUCT.md)**: Our commitment to an open and welcoming environment.
- **[License](./LICENSE)**: This project is licensed under the MIT License.

