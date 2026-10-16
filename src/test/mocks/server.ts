import { setupServer } from "msw/node"

import { handlers } from "./handlers"

/** Imported by the Vitest setup only; production never starts API interception. */
export const server = setupServer(...handlers)
