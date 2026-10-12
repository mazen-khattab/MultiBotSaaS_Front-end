import type { FieldValues } from "react-hook-form"

import type { CreateRunDto } from "@/features/runs/types/runs.types"
import type { StartRunConfig } from "@/registry/configs/runsConfig.types"

/** Contract IDs are positive C# int values, including the bot route parameter. */
function isContractId(value: number): boolean {
  return Number.isInteger(value) && value > 0 && value <= 2_147_483_647
}

/** Compose only the documented DTO; feature functions resolve all selections. */
export async function createRunAdapter<TInput extends FieldValues, TOutput extends FieldValues = TInput>(
  botId: string,
  values: TOutput,
  config: StartRunConfig<TInput, TOutput>,
): Promise<CreateRunDto> {
  if (!/^\d+$/.test(botId) || !isContractId(Number(botId))) {
    throw { message: "This bot ID is invalid. Open the bot workspace again." }
  }
  const context = { botId: Number(botId) }
  const selection = await config.resolveSelection(values, context)
  if (!isContractId(selection.connectedAccountId)) {
    throw { message: "Choose an available connected account." }
  }
  if (selection.accountStatus !== "Active") {
    throw { message: selection.accountStatus === null
      ? "The selected account's status cannot be verified. Run creation is unavailable until account status is provided."
      : "Choose a connected account with Active status before starting a run." }
  }
  if (selection.targetGroupId != null && !isContractId(selection.targetGroupId)) {
    throw { message: "Choose an available target group." }
  }
  const infoJson = config.serializeInfoJson ? config.serializeInfoJson(values, context) : "{}"
  // The backend stores this opaque string. Do not parse, normalize, or infer a
  // bot schema here; metadata validation belongs to the module's form/serializer.
  if (typeof infoJson !== "string") {
    throw { message: "The run configuration could not be prepared. Please review the module configuration." }
  }
  return {
    botId: context.botId,
    connectedAccountId: selection.connectedAccountId,
    ...(selection.targetGroupId === undefined ? {} : { targetGroupId: selection.targetGroupId }),
    infoJson,
  }
}
