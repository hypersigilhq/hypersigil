25-07-25_13-48

# Docker Multi-Architecture Build and Push Script

## Overview
A comprehensive shell script that automates the process of building and pushing multi-architecture Hypersigil Docker images to Docker Hub registry using Docker Buildx. The script provides an interactive interface for tag selection, platform selection, and includes proper validation and error handling.

## Implementation Details

### Script Location
- **File**: `push-docker.sh`
- **Permissions**: Executable (`chmod +x`)

### Key Features

#### 1. Multi-Architecture Support
- **Docker Buildx Integration**: Uses Docker Buildx for cross-platform builds
- **Platform Selection**: Interactive platform selection with predefined options
- **Default Platforms**: `linux/amd64,linux/arm64` (Intel/AMD and ARM64)
- **Custom Platform Support**: Allows custom platform combinations
- **Automatic Builder Management**: Creates and manages dedicated buildx builder

#### 2. Interactive Tag Selection
- Prompts user for custom tag name
- Provides tag suggestions:
  - `latest` (most recent stable version)
  - Semantic versioning (`v1.0.0`, `v1.0.1`, etc.)
  - Environment-specific (`dev`, `staging`, `prod`)
  - Date-based (current date format)

#### 3. Platform Options
- **Multi-architecture (Recommended)**: `linux/amd64,linux/arm64`
- **AMD64 only**: `linux/amd64` (Intel/AMD processors)
- **ARM64 only**: `linux/arm64` (Apple Silicon, ARM servers)
- **Custom platforms**: User-defined platform combinations

#### 4. Validation and Safety Checks
- **Docker Buildx Availability**: Verifies Buildx is installed and available
- **Docker Hub Authentication**: Checks if user is logged into Docker Hub
- **Source Directory Verification**: Confirms required `ui` and `backend` directories exist
- **Tag Name Validation**: Ensures tag follows Docker naming conventions
- **Build Confirmation**: Requires user confirmation before building and pushing

#### 5. Docker Hub Integration
- **Repository**: `codefibers/hypersigil`
- **Direct Build and Push**: Builds and pushes in a single operation
- **Multi-platform Manifest**: Creates unified manifest supporting all target platforms

#### 6. User Experience Features
- **Colored Output**: Uses consistent color scheme matching `build-docker.sh`
- **Progress Feedback**: Clear status messages throughout the build process
- **Platform Information**: Shows supported platforms in success message
- **Usage Instructions**: Provides pull and run commands after successful push
- **Builder Cleanup**: Optional removal of buildx builder after completion

### Script Workflow

1. **Pre-flight Checks**
   - Verify Docker Buildx availability
   - Check Docker Hub authentication status
   - Offer to login if not authenticated
   - Confirm required source directories exist

2. **Tag Selection**
   - Display tag suggestions with explanations
   - Validate user input against Docker naming rules
   - Confirm final tag selection

3. **Platform Selection**
   - Present platform options (multi-arch, AMD64, ARM64, custom)
   - Validate platform selection
   - Configure target platforms for build

4. **Builder Setup**
   - Create or reuse dedicated buildx builder (`hypersigil-builder`)
   - Configure builder for multi-platform builds
   - Bootstrap builder if newly created

5. **Multi-Architecture Build and Push**
   - Execute `docker buildx build` with selected platforms
   - Build images for all target architectures simultaneously
   - Push multi-platform manifest to Docker Hub
   - Provide detailed progress feedback

6. **Post-build Cleanup**
   - Optional removal of buildx builder
   - Final status confirmation with platform information

### Error Handling
- **Missing Buildx**: Directs user to install Docker Desktop or enable Buildx
- **Missing Source Directories**: Validates `ui` and `backend` directories exist
- **Authentication Issues**: Guides through Docker login process
- **Invalid Tag Names**: Provides clear validation feedback
- **Build Failures**: Proper error reporting and exit codes
- **Platform Validation**: Ensures valid platform specifications

### Integration with Build System
- **Direct Source Build**: Builds directly from source (no dependency on local image)
- **Consistent Styling**: Matches color scheme and output format of build script
- **Repository Configuration**: Hard-coded Docker Hub repository (`codefibers/hypersigil`)
- **Buildx Builder Management**: Handles builder lifecycle automatically

## Usage Examples

### Basic Usage
```bash
./push-docker.sh
```

### Example Session
```
🚀 Starting Hypersigil Docker multi-architecture build and push process...
[INFO] Checking Docker Buildx availability...
[SUCCESS] Docker Buildx is available
[INFO] Checking Docker Hub authentication...
[SUCCESS] Docker Hub authentication verified

[INFO] Available tag suggestions:
  - latest (most recent stable version)
  - v1.0.0, v1.0.1, etc. (semantic versioning)
  - dev, staging, prod (environment-specific)
  - 2025-01-25 (date-based)

Enter tag name for codefibers/hypersigil: v1.0.0

[INFO] Platform options:
  1. Multi-architecture (linux/amd64,linux/arm64) - Recommended
  2. AMD64 only (linux/amd64)
  3. ARM64 only (linux/arm64)
  4. Custom platforms

Select platform option (1-4): 1

[INFO] Setting up Docker Buildx builder...
[INFO] Creating new buildx builder 'hypersigil-builder'...

[INFO] Ready to build and push:
  Repository:   codefibers/hypersigil
  Tag:          v1.0.0
  Full tag:     codefibers/hypersigil:v1.0.0
  Platforms:    linux/amd64,linux/arm64

Do you want to proceed with the multi-architecture build and push? (y/n): y
[INFO] Building and pushing multi-architecture image...
[INFO] This may take several minutes depending on your internet connection and the number of platforms...

[SUCCESS] Multi-architecture image built and pushed successfully!

[INFO] Your multi-architecture image is now available at:
  https://hub.docker.com/r/codefibers/hypersigil

[INFO] Supported platforms: linux/amd64,linux/arm64

[INFO] To pull this image:
  docker pull codefibers/hypersigil:v1.0.0

[INFO] Docker will automatically pull the correct architecture for your platform.
```

## Technical Specifications

### Dependencies
- **Docker CLI**: With Buildx extension and push permissions
- **Docker Buildx**: Multi-platform build support (included in Docker Desktop)
- **Source Code**: `ui` and `backend` directories with complete source
- **Docker Hub Account**: With access to `codefibers/hypersigil` repository

### Configuration
- **Docker Repository**: `codefibers/hypersigil`
- **Builder Name**: `hypersigil-builder` (automatically managed)
- **Default Platforms**: `linux/amd64,linux/arm64`
- **Shell**: Bash with `set -e` for error handling

### Supported Platforms
- **linux/amd64**: Intel/AMD 64-bit processors (most common)
- **linux/arm64**: ARM 64-bit processors (Apple Silicon, ARM servers)
- **linux/arm/v7**: ARM 32-bit processors (Raspberry Pi, etc.)
- **Custom combinations**: User-defined platform sets

### Security Considerations
- Requires Docker Hub authentication
- Validates repository access before building
- No sensitive information stored in script
- Uses dedicated buildx builder for isolation

## Benefits

1. **Multi-Platform Support**: Single command creates images for multiple architectures
2. **Streamlined Deployment**: Simplifies the Docker Hub publishing process for all platforms
3. **Error Prevention**: Comprehensive validation prevents common mistakes
4. **User-Friendly**: Interactive interface with clear guidance and platform selection
5. **Consistent Branding**: Maintains visual consistency with other build scripts
6. **Flexible Tagging**: Supports various tagging strategies for different use cases
7. **Future-Proof**: Ready for ARM-based cloud infrastructure and Apple Silicon
8. **Automatic Platform Detection**: Docker automatically selects the correct architecture when pulling
