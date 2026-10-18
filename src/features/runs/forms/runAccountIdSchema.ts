import { z } from "zod";

/** The form uses a string option; CreateRunDto expects a positive Int32 ID. */
export const runAccountIdSchema = z
  .string()
  .regex(/^[1-9]\d*$/, "Choose a connected account.")
  .refine(
    (value) => Number(value) <= 2_147_483_647,
    "Choose a connected account.",
  );

export const runAccountOptionsProvider = "member-messages-accounts";

/** Reuse the selector while each bot keeps its own custom workflow fields. */
export const runAccountField = {
  name: "accountId",
  label: "Connected account",
  type: "select",
  optionsProvider: runAccountOptionsProvider,
  placeholder: "Choose a connected account",
  required: true,
} as const;
