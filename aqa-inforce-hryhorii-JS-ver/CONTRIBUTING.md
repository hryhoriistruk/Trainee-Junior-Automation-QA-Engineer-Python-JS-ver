# Contributing to aqa-inforce-hryhoriistruk

Thank you for your interest in contributing to this project!

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/<your-username>/aqa-inforce-hryhoriistruk.git`
3. Navigate to the project directory: `cd aqa-inforce-hryhoriistruk`
4. Install dependencies: `npm install`
5. Copy environment template: `cp .env.example .env`
6. Make your changes

## Code Style

### JavaScript/Cypress
- Use ESLint for linting: `npm run lint`
- Auto-fix linting issues: `npm run lint:fix`
- Format code with Prettier: `npm run format`
- Check formatting: `npm run format:check`

### Testing
- Run all tests: `npm test`
- Run UI tests only: `npm run test:ui`
- Run API tests only: `npm run test:api`
- Run with HTML report: `npm run test:report`

## Pull Request Process

1. Create a new branch from `main`: `git checkout -b feature/your-feature-name`
2. Make your changes and commit them with clear messages
3. Push to your fork: `git push origin feature/your-feature-name`
4. Create a pull request to this repository

### PR Checklist
- [ ] Code follows the project's style guidelines
- [ ] All tests pass locally
- [ ] Linting passes without errors
- [ ] Documentation is updated if needed
- [ ] Commit messages are clear and descriptive

## Adding New Tests

1. Update `test-cases.txt` with the new test case documentation
2. Implement the test in the appropriate spec file:
   - UI tests: `cypress/e2e/user-spec.cy.js`
   - API tests: `cypress/e2e/admin-spec.cy.js`
3. Add custom commands to `cypress/support/commands.js` if needed
4. Add data builders to `cypress/support/utils.js` if needed
5. Update fixtures in `cypress/fixtures/` if needed

## Reporting Issues

When reporting issues, please include:
- Description of the issue
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, Node.js version, Cypress version)
- Screenshots or logs if applicable

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
