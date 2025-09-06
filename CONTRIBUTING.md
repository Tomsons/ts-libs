# Contributing to ts-libs

Thank you for considering contributing to ts-libs. We welcome bug fixes, features, documentation updates, and ideas to improve the project.

## Repository Structure

This repository uses Nx to manage a TypeScript monorepo.

- Libraries: `packages/`
- Example apps (if any): `examples/`

## Prerequisites

- Node.js (LTS)
- pnpm
- Git

## Getting Started

1. Fork the repository and clone your fork:
   ```bash
   git clone https://github.com/<your-username>/ts-libs.git
   cd ts-libs
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Explore Nx commands:
   ```bash
   pnpm nx graph        # Visualize the project graph
   pnpm nx build <lib-name>  # Build a specific library
   pnpm nx test <lib-name>   # Run tests for a specific library
   ```

## Development Workflow

1. Create a feature branch:
   ```bash
   git checkout -b feat/my-new-feature
   ```

2. Make changes in the appropriate `packages/<lib-name>` folder.

3. Format and lint before committing (wip):


4. Run tests:
   ```bash
   pnpm test
   # or for a single lib
   pnpm nx test <lib-name>
   ```

5. Use Conventional Commits for commit messages:
   - `feat(<scope>): <summary>`
   - `fix(<scope>): <summary>`
   - `docs(<scope>): <summary>`
   - `chore(<scope>): <summary>`
   - `refactor(<scope>): <summary>`
   - Example:
     ```text
     feat(utils-date): add parseIso helper
     fix(core-http): guard against undefined headers
     docs: update root README with usage examples
     ```

6. Push your branch and open a Pull Request.

## Pull Request Guidelines

- Keep PRs focused. One feature or fix per PR when possible.
- Include or update tests for code changes.
- Update documentation if behavior or usage changes.
- Ensure CI checks pass before requesting review.

## Code Style

- TypeScript should run in strict mode.
- Follow existing linting rules (ESLint + Prettier).
- Keep libraries independent unless a dependency is clearly needed.
- Prefer small, focused exports with clear names.
- Public APIs should be stable and documented.

## Documentation

- Public APIs must have TSDoc comments.
- If your change affects usage, update the relevant `README.md` in the library and the root README if applicable.

## Testing

- Use Vitest for unit tests.
- Strive for high coverage on new or changed code.
- Run tests locally and ensure they pass:
  ```bash
  pnpm nx test <lib-name>
  ```

## Community

- Use GitHub Issues for bugs and feature requests.
- Be respectful and constructive in discussions and reviews.
- Suggestions and feedback are appreciated.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
