# Project Structure: MultiBotSaaS Front-end

This document outlines the folder and file structure of the MultiBotSaaS Front-end project. It details the purpose of each directory and the usage of each file to help developers navigate and understand the architecture.

## `/` (Root Directory)
The root directory contains project configuration files, dependency definitions, and environment templates.

*   **`.env.example`**: A template for environment variables. It exists to show developers which environment variables are required to run the project without exposing actual sensitive keys.
*   **`components.json`**: Configuration file for shadcn/ui or similar component libraries. It dictates how UI components are generated and where they should be placed in the project.
*   **`eslint.config.js`**: The ESLint configuration file. It enforces coding standards, code formatting rules, and catches syntax errors to maintain code quality across the team.
*   **`index.html`**: The main HTML template for the Vite application. It serves as the entry point for the browser, containing the root `<div id="root"></div>` where the React app is mounted.
*   **`package.json`**: The npm/yarn package manifest. It lists all project dependencies (libraries), defines project metadata, and contains custom scripts (like `dev`, `build`, `lint`).
*   **`tsconfig.app.json`**: TypeScript configuration specifically for the front-end application code. It defines compiler options suited for React and browser environments.
*   **`tsconfig.json`**: The base TypeScript configuration file. It often references `tsconfig.app.json` and `tsconfig.node.json` to separate front-end and build-tooling type contexts.
*   **`tsconfig.node.json`**: TypeScript configuration for Node.js scripts (like `vite.config.ts`). It ensures Node-specific globals and module resolutions are typed correctly.
*   **`vite.config.ts`**: The configuration file for Vite, the build tool and development server. It configures plugins (like React), path aliases, and server settings.

---

## `/src`
The main source directory containing all the application code.

*   **`vite-env.d.ts`**: TypeScript declarations for Vite's client environment. It provides typing for things like `import.meta.env` and static asset imports.

---

## `/src/app`
Contains the core initialization, global providers, and routing setup for the application.

*   **`App.tsx`**: The root component of the React application. It typically wraps the main router and sets up the global structure.
*   **`main.tsx`**: The absolute entry point of the React app. It renders the `<App />` component into the DOM (inside `index.html`).

### `/src/app/providers`
*   **`AppProviders.tsx`**: A wrapper component that consolidates all global context providers (e.g., Theme, Auth, Query clients) to keep the `App.tsx` clean.

### `/src/app/router`
*   **`routePaths.ts`**: A centralized file containing all the URL route paths as constants. It prevents hardcoding URLs across the app and makes refactoring easier.
*   **`router.tsx`**: The main routing configuration file (e.g., using React Router). It maps URL paths to their respective page components and layouts.
*   **`routeTypes.ts`**: TypeScript definitions related to routing, such as route parameter types or custom route objects, ensuring type safety during navigation.

---

## `/src/core`
Contains foundational code, configuration, and constants used application-wide.

### `/src/core/config`
*   **`env.ts`**: A central file to validate and export environment variables in a type-safe way. It ensures the app doesn't run with missing critical configurations.

### `/src/core/constants`
*   **`app.ts`**: Global application constants, such as app name, version, or default pagination limits, providing a single source of truth for fixed values.

---

## `/src/features`
Contains feature-specific code (following a Feature-Sliced or Domain-Driven structure). Each domain has its own encapsulated logic and UI.

### `/src/features/admin`
Administrative features and views.

#### `/src/features/admin/navigation`
*   **`adminNavigation.ts`**: Defines the navigation structure (sidebar links, icons, permissions) specifically for the admin dashboard.

#### `/src/features/admin/pages`
*   **`AdminBotsPage.tsx`**: The page where platform administrators can view and manage all bots across the SaaS.
*   **`AdminOverviewPage.tsx`**: The main admin dashboard landing page, likely displaying high-level platform statistics.
*   **`AdminSubscriptionsPage.tsx`**: The page for managing user subscriptions, billing plans, and quotas.
*   **`AdminTransactionsPage.tsx`**: The page displaying financial transactions and payment history across the platform.
*   **`AdminUsersPage.tsx`**: The page where admins can manage platform users (clients), including suspending accounts or resetting passwords.

---

### `/src/features/auth`
Authentication-related views.

#### `/src/features/auth/pages`
*   **`AdminLoginPage.tsx`**: A dedicated login page for platform administrators.
*   **`UserLoginPage.tsx`**: The standard login page for regular users/clients of the SaaS.

---

### `/src/features/bots`
Features related to managing individual bots.

#### `/src/features/bots/pages`
*   **`BotTabRoutePage.tsx`**: A routing component that manages tabbed navigation within a specific bot's workspace (e.g., switching between Settings, Analytics, and Knowledge Base for a single bot).
*   **`BotWorkspaceHomePage.tsx`**: The main dashboard or landing view for a specific bot's workspace.

---

### `/src/features/client`
Features for the end-users (clients) managing their own accounts and bots.

#### `/src/features/client/navigation`
*   **`clientNavigation.ts`**: Defines the navigation structure (sidebar links) for the regular client dashboard.

#### `/src/features/client/pages`
*   **`ClientBotsPage.tsx`**: The page where a client can see a list of their owned bots and create new ones.
*   **`ClientOverviewPage.tsx`**: The main dashboard landing page for a client, showing an overview of their account usage.
*   **`ClientSettingsPage.tsx`**: The page for clients to manage their personal profile, billing details, and account preferences.

---

## `/src/layouts`
Structural layout components that wrap around pages.

### `/src/layouts/admin`
*   **`AdminLayout.tsx`**: The layout wrapper for admin pages, typically containing the admin sidebar and top navigation header.

### `/src/layouts/auth`
*   **`AuthLayout.tsx`**: A minimalistic layout for authentication pages (login, signup), often centered on the screen without main navigation bars.

### `/src/layouts/bot`
*   **`BotWorkspaceLayout.tsx`**: The layout specific to editing a single bot, containing bot-specific navigation or context headers.

### `/src/layouts/client`
*   **`ClientMainLayout.tsx`**: The standard layout for logged-in clients, wrapping their dashboard views with a user-specific sidebar and header.

---

## `/src/pages`
Generic or global pages that don't belong to a specific feature domain.

*   **`NotFoundPage.tsx`**: A generic 404 Error page shown when a user navigates to an unknown URL.
*   **`RootRedirectPage.tsx`**: A component that acts as the root (`/`) route, intelligently redirecting the user based on their authentication status and role (admin vs. client).

---

## `/src/shared`
Reusable code, UI components, hooks, and utilities shared across multiple features.

### `/src/shared/components/feedback`
*   **`ComingSoonState.tsx`**: A placeholder component to indicate features that are under development.
*   **`PageErrorState.tsx`**: A fallback component displayed when a page fails to load or encounters an error (often used with Error Boundaries).
*   **`RouteLoadingState.tsx`**: A visual indicator (like a spinner or skeleton) shown during route transitions or data fetching.

### `/src/shared/components/layout`
*   **`DashboardHeader.tsx`**: The top navigation bar used across various dashboard layouts.
*   **`DashboardShell.tsx`**: A generic structural container that orchestrates the layout of the sidebar, header, and main content area.
*   **`DashboardSidebar.tsx`**: The generic sidebar component responsible for rendering navigation links.
*   **`MobileSidebarTrigger.tsx`**: A hamburger menu button used on mobile devices to open the hidden sidebar.
*   **`PageContainer.tsx`**: A wrapper to ensure consistent padding and max-width for page content.

### `/src/shared/components/navigation`
*   **`NavigationGroup.tsx`**: A component to render a grouped section of navigation links (e.g., a header in the sidebar).
*   **`NavigationItem.tsx`**: A single clickable link inside the navigation sidebar.
*   **`WorkspaceBackLink.tsx`**: A specialized navigation link used to return from a deep workspace context (like a single bot) back to a broader dashboard.

### `/src/shared/hooks`
*   **`useSidebar.ts`**: A custom React hook for managing the state (open/closed/collapsed) of the sidebar layout.

### `/src/shared/lib`
*   **`utils.ts`**: A collection of generic, reusable helper functions (e.g., class name merging with `clsx` and `tailwind-merge`).

### `/src/shared/types`
*   **`navigation.ts`**: Shared TypeScript interfaces/types defining the shape of navigation items, ensuring consistency across different layout configurations.

### `/src/shared/ui`
These are fundamental UI building blocks, highly likely generated by shadcn/ui.
*   **`avatar.tsx`**: A component for displaying user profile pictures or initials.
*   **`breadcrumb.tsx`**: A component indicating the user's current location within a hierarchical path.
*   **`button.tsx`**: A standardized interactive button component.
*   **`dropdown-menu.tsx`**: Components for accessible dropdown menus (e.g., for user settings).
*   **`separator.tsx`**: A visual dividing line (hr) component.
*   **`sheet.tsx`**: A slide-out panel component (often used for mobile sidebars or detail panes).
*   **`sidebar.tsx`**: Foundational components for building a custom sidebar.
*   **`skeleton.tsx`**: A placeholder component used during loading states to mimic the shape of content.
*   **`tooltip.tsx`**: A pop-up component that shows extra information when hovering over an element.

---

## `/src/styles`
Global CSS and styling definitions.

*   **`globals.css`**: The main stylesheet. It imports Tailwind CSS directives and defines global CSS variables (like theme colors) used by components.
