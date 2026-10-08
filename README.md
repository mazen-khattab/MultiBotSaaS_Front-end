# MultiBotSaaS Front-end

Welcome to the MultiBotSaaS Front-end repository! This project serves as the client-facing and administrative interface for our Multi-Bot Software as a Service (SaaS) platform, allowing users to manage multiple bots and administrators to oversee the platform ecosystem.

## 🚀 Tech Stack

This project is built using modern web development technologies to ensure performance, type safety, and a great developer experience:

- **Framework**: [React 18](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (Radix UI)
- **Routing**: Client-side routing mapped to feature-based modules

## 📦 Prerequisites

Before getting started, ensure you have the following installed on your machine:
- Node.js (v18 or higher recommended)
- npm, yarn, or pnpm

## 🛠️ Getting Started

### 1. Clone the repository
```bash
git clone <your-repository-url>
cd MultiBotSaaS_Front-end
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Environment Variables
Copy the example environment file and update it with your local configurations:
```bash
cp .env.example .env
```

### 4. Start the Development Server
```bash
npm run dev
# or
yarn dev
```
The application will be available at `http://localhost:5173`.

## 📁 Project Structure

This project follows a scalable, domain-driven structure loosely based on Feature-Sliced Design.

For a comprehensive breakdown of all directories and files in this repository, please refer to the [Project Structure Documentation](./project_structure.md).

### High-level Overview:
- `src/app/`: Core application initialization, routing, and providers.
- `src/core/`: Application-wide configurations and constants.
- `src/features/`: Domain-specific encapsulated modules (`admin`, `auth`, `bots`, `client`).
- `src/layouts/`: Structural wrapper components for different contextual views.
- `src/shared/`: Reusable, generic UI components (like shadcn), hooks, and utilities.

## 📜 Available Scripts

- `npm run dev` - Starts the Vite development server.
- `npm run build` - Builds the application for production.
- `npm run lint` - Runs ESLint to catch formatting and code quality issues.
- `npm run preview` - Locally preview the production build.

## 🤝 Contributing
When contributing to this repository, please ensure that your code adheres to the project's ESLint rules and TypeScript strict typings. Ensure you place domain-specific code inside the respective `src/features/` folder.
