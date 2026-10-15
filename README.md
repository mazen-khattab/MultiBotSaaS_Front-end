# MultiBotSaaS Front-end

Welcome to the **MultiBotSaaS Front-end** repository! This project serves as the modern client-facing and administrative interface for our Multi-Bot Software as a Service (SaaS) platform, enabling users to configure and interact with multiple bot modules and administrators to oversee the ecosystem.

---

## 🚀 Tech Stack

This project is built using modern web technologies to ensure peak performance, type safety, and an exceptional developer experience:

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 8](https://vitejs.dev/) with `@tailwindcss/vite`
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict mode)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Primitives**: [Radix UI](https://www.radix-ui.com/) & shadcn/ui design patterns
- **Routing**: [React Router v7](https://reactrouter.com/)
- **Server State & Data Fetching**: [TanStack Query v5](https://tanstack.com/query/latest)
- **Data Tables**: [TanStack Table v9](https://tanstack.com/table/latest)
- **Forms & Validation**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 📦 Prerequisites

Before getting started, make sure your local environment meets these requirements:

- **Node.js**: `>= 22.12.0` (strictly required by `package.json` engines)
- **Package Manager**: npm (`>= 11.9.0`), yarn, or pnpm

---

## 🛠️ Getting Started

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd MultiBotSaaS_Front-end
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Copy the template file to set up your environment variables:
```bash
cp .env.example .env
```
Ensure required environment values (such as API base URLs) are properly filled in.

### 4. Start the Development Server
```bash
npm run dev
```
The application will run locally at `http://localhost:5173`.

---

## 📁 Project Structure

The project follows a scalable, domain-driven structure loosely inspired by Feature-Sliced Design:

```text
src/
├── app/          # App initialization, root providers, router configuration
├── context/      # Shared React contexts (Auth, Theme, etc.)
├── core/         # Global configurations, environment parsing, and app constants
├── features/     # Domain-encapsulated features (admin, auth, bots, client)
├── layouts/      # Shell and layout wrapper components for different application views
├── pages/        # Route page entry points mapped to application routes
├── registry/     # Extensible bot modules registry and declarative configs (forms, tables)
├── services/     # Shared API clients, Axios instances, and global endpoints
├── shared/       # Reusable UI components (shadcn/radix), custom hooks, dynamic forms, and utils
└── styles/       # Global CSS styles, Tailwind configuration, and themes
```

For an exhaustive breakdown of every directory and file, see the [Project Structure Documentation](./project_structure.md).

Before adding a feature integration, read the [frontend capability matrix](./docs/frontend-capability-matrix.md)
and [backend blockers](./docs/backend-blockers.md), then check the live backend contract.
These distinguish existing APIs from incomplete frontend work and unsupported operations.

---

## 📜 Available Scripts

| Script | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server with Hot Module Replacement (HMR). |
| `npm run build` | Compiles TypeScript types and builds the production bundles. |
| `npm run lint` | Runs ESLint to check for code quality and syntax issues. |
| `npm run typecheck` | Validates TypeScript types across the codebase without emitting files. |
| `npm run test` | Runs the automated test suite using the native Node.js test runner. |
| `npm run preview` | Locally serves the production build for testing. |

---

## 🤝 Contributing

When contributing to this repository:
1. Ensure your code satisfies `npm run lint` and `npm run typecheck`.
2. Keep domain-specific UI and logic encapsulated within `src/features/` or `src/registry/`.
3. Use the dynamic form/table configs (`src/registry/configs/`) when registering bot module views.
