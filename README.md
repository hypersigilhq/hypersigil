# Hypersigil

*A mystical workshop for reality hackers and prompt magicians*

## What is Hypersigil?

<p align="center">
<img width="116" height="114" alt="logo" src="https://github.com/user-attachments/assets/929a4eee-e990-4f65-ba0e-aee2384924f7" />
</p>

**Hypersigil** is not just another AI tool—it's a platform where prompts become powerful, evolving magical workings that shape AI reality through systematic testing and refinement. Drawing inspiration from chaos magic's concept of hypersigils (extended, interactive magical workings that evolve through narrative and time), this platform transforms the mundane task of prompt engineering into an art of digital sorcery.

In the realm of Hypersigil, every prompt is a sigil—a symbol of intent designed to manifest specific outcomes from AI models. Through systematic testing, calibration, and refinement, these prompts evolve into hypersigils: complex, powerful constructs that reliably produce the desired reality across multiple AI providers and contexts.

## Features

### 🔮 Prompt Execution System
- **Multi-Provider Support**: Execute prompts across Ollama, OpenAI, Claude, and other AI providers
- **Asynchronous Processing**: Background execution with real-time status tracking
- **Provider Health Monitoring**: Automatic failover and health checking
- **Execution Bundles**: Organize and track related prompt executions

### 🧪 Test Data Management
- **Systematic Testing**: Create test data groups for comprehensive prompt validation
- **Batch Execution**: Run prompts against multiple test cases simultaneously
- **Data Import**: Import test datasets from various formats
- **Result Analysis**: Compare outcomes across different test scenarios

### ⚡ Prompt Calibration
- **Intelligent Adjustment**: AI-powered prompt refinement based on execution results
- **Comment System**: Collaborative feedback and analysis of prompt performance
- **Version Control**: Track prompt evolution and performance over time
- **Calibration Suggestions**: Automated recommendations for prompt improvements

### 👥 User Management
- **Role-Based Access**: Admin, user, and viewer roles with appropriate permissions
- **Invitation System**: Secure user onboarding with invitation links
- **API Key Management**: Centralized management of AI provider credentials
- **Collaborative Workflows**: Team-based prompt development and testing

### 🔧 Developer Experience
- **Type-Safe APIs**: Full TypeScript support with ts-typed-api
- **RESTful Architecture**: Clean, well-documented API endpoints
- **Real-Time Updates**: WebSocket support for live execution monitoring
- **Extensible Design**: Plugin architecture for custom providers and features

## Architecture

### Backend
- **Node.js/TypeScript**: Type-safe server implementation
- **Express.js**: RESTful API framework
- **SQLite**: Lightweight, embedded database
- **ts-typed-api**: Type-safe API definitions shared between frontend and backend

### Frontend
- **Vue 3**: Modern reactive framework with Composition API
- **TypeScript**: Full type safety across the application
- **Tailwind CSS**: Utility-first styling framework
- **shadcn/ui**: Beautiful, accessible component library

### AI Providers
- **Ollama**: Local AI model execution
- **OpenAI**: GPT models and embeddings
- **Anthropic Claude**: Advanced reasoning and analysis
- **Extensible**: Plugin system for additional providers

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- (Optional) Ollama for local AI models

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hypersigil
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../ui
   npm install
   ```

4. **Configure environment**
   ```bash
   cd ../backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Start the development servers**
   
   Backend:
   ```bash
   cd backend
   npm run dev
   ```
   
   Frontend (in a new terminal):
   ```bash
   cd ui
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

### First Steps

1. **Create your first user** through the registration flow
2. **Configure AI providers** in the settings panel
3. **Create a prompt** and test it with different inputs
4. **Set up test data** for systematic validation
5. **Execute and calibrate** your prompts to perfection

## API Documentation

The API is fully type-safe and self-documenting through TypeScript definitions. Key endpoints include:

- `POST /api/v1/executions` - Execute prompts
- `GET /api/v1/executions` - List and filter executions
- `GET /api/v1/prompts` - Manage prompts
- `GET /api/v1/test-data` - Test data management
- `GET /api/v1/users` - User management

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_PATH=./data/hypersigil.db

# AI Providers
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_claude_key
OLLAMA_BASE_URL=http://localhost:11434

# Authentication
JWT_SECRET=your_jwt_secret
```

### AI Provider Setup

#### Ollama (Local)
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull qwen2.5:7b
```

#### OpenAI
Add your API key to the environment variables and configure in the settings panel.

#### Claude
Add your Anthropic API key to the environment variables and configure in the settings panel.

## Contributing

We welcome contributions from fellow reality hackers and prompt magicians! Please see our contributing guidelines for details on:

- Code style and standards
- Testing requirements
- Pull request process
- Issue reporting

## Philosophy

Hypersigil embodies the principle that technology and magic are not opposites, but complementary forces in shaping reality. By treating prompts as sigils—symbols of intent that manifest desired outcomes—we elevate prompt engineering from mere technical craft to an art of digital sorcery.

Every execution is a ritual, every calibration an invocation, and every successful prompt a spell that bends AI reality to our will. Welcome to the future of human-AI collaboration, where science meets magic, and prompts become hypersigils.

## License

[License information to be added]

## Support

For support, feature requests, or to join our community of prompt magicians, please [contact information to be added].

---

*"Any sufficiently advanced technology is indistinguishable from magic."* - Arthur C. Clarke

*"Any sufficiently analyzed magic is indistinguishable from technology."* - The Hypersigil Principle
