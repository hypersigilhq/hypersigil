# Documentation

This directory contains the documentation for Hypersigil, built with [MkDocs](https://www.mkdocs.org/) and the [Material theme](https://squidfunk.github.io/mkdocs-material/).

## Local Development

### Prerequisites

- Python 3.7 or higher
- Git (for the git-revision-date plugin)

### Setup

1. Create and activate a virtual environment:
   ```bash
   python3 -m venv mkdocs-env
   source mkdocs-env/bin/activate  # On Windows: mkdocs-env\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Development Commands

- **Serve locally**: `mkdocs serve`
  - The documentation will be available at `http://127.0.0.1:8000`
  - Auto-reloads when you make changes to files

- **Build static site**: `mkdocs build`
  - Generates static files in the `site/` directory

- **Deploy to GitHub Pages**: `mkdocs gh-deploy`
  - Builds and pushes to the `gh-pages` branch

### File Structure

```
docs/
├── index.md              # Home page
├── introduction.md       # Platform introduction and concepts
├── prompts.md           # Prompt management documentation
├── executions.md        # Execution system documentation
├── test-data.md         # Test data management
├── settings.md          # Settings and configuration
└── README.md           # This file

mkdocs.yml               # MkDocs configuration
requirements.txt         # Python dependencies
.github/workflows/docs.yml  # GitHub Actions for auto-deployment
```

## GitHub Pages Deployment

The documentation is automatically deployed to GitHub Pages when changes are pushed to the `main` branch. The deployment is handled by GitHub Actions (see `.github/workflows/docs.yml`).

### Manual Deployment

If you need to deploy manually:

1. Ensure you have the necessary permissions to push to the repository
2. Run: `mkdocs gh-deploy`

This will build the documentation and push it to the `gh-pages` branch.

## Configuration

The main configuration is in `mkdocs.yml`. Key settings include:

- **Site information**: Name, description, URL
- **Theme configuration**: Material theme with dark/light mode toggle
- **Navigation structure**: Page organization
- **Plugins**: Search, git revision dates
- **Markdown extensions**: Enhanced formatting capabilities

## Writing Documentation

### Markdown Features

The documentation supports enhanced Markdown features through PyMdown Extensions:

- **Admonitions**: `!!! note "Title"`
- **Code highlighting**: Syntax highlighting for various languages
- **Tabs**: Tabbed content sections
- **Task lists**: `- [x] Completed task`
- **Emoji**: `:material-heart:` renders as :material-heart:

### Navigation

Pages are automatically added to navigation based on the `nav` section in `mkdocs.yml`. To add a new page:

1. Create a new `.md` file in the `docs/` directory
2. Add it to the `nav` section in `mkdocs.yml`
3. The page will appear in the navigation menu

### Links

- **Internal links**: `[Page Title](page-name.md)`
- **External links**: `[External Site](https://example.com)`
- **Anchors**: `[Section](#section-heading)`

## Troubleshooting

### Common Issues

1. **Git revision warnings**: If you see warnings about git logs, ensure the repository has commit history
2. **Build failures**: Check that all referenced files exist and links are valid
3. **Styling issues**: Verify that the Material theme is properly installed

### Getting Help

- [MkDocs Documentation](https://www.mkdocs.org/)
- [Material Theme Documentation](https://squidfunk.github.io/mkdocs-material/)
- [PyMdown Extensions](https://facelessuser.github.io/pymdown-extensions/)
