import { z } from "zod";

export const runTargetGroupIdSchema = z
  .string()
  .regex(/^[1-9]\d*$/, "Choose a target group.")
  .refine((value) => Number(value) <= 2_147_483_647, "Choose a target group.");

export const runTargetGroupOptionsProvider = "run-target-groups";

/** Reuse the selector while each bot keeps its own custom workflow fields. */
export const runTargetGroupField = {
  name: "targetGroupId",
  label: "Target group",
  type: "select",
  optionsProvider: runTargetGroupOptionsProvider,
  placeholder: "Choose a target group",
  description: "Choose an active group saved in this bot's Target groups.",
  required: true,
} as const;
