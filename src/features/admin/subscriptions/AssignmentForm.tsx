import { normalizeApiError } from "@/core/api/apiError"
import { DynamicForm } from "@/shared/components/dynamic-form/DynamicForm"
import type { DynamicFormConfig } from "@/shared/components/dynamic-form/dynamicForm.types"
import { assignAdminSubscriptionSchema, type AssignAdminSubscription } from "./subscriptions.types"
import { useAdminSubscriptionMutations } from "./useAdminSubscriptions"

const config: DynamicFormConfig<AssignAdminSubscription> = {
  schema: assignAdminSubscriptionSchema,
  defaultValues: { userId: "" },
  fields: [
    { name: "userId", type: "text", label: "User ID", required: true, description: "Copy the regular user's GUID from Users → Details." },
    { name: "botId", type: "number", label: "Bot ID", min: 1, max: 2_147_483_647, step: 1, required: true,
      description: "Copy the bot ID from Bots → Details. Inactive bots may also be assigned." },
  ],
}

/** Purchase amount, timestamp and activation state are server managed. */
export function AssignmentForm({ onSaved, onSubmittingChange }: {
  readonly onSaved: () => void
  readonly onSubmittingChange: (busy: boolean) => void
}) {
  const mutation = useAdminSubscriptionMutations()
  return <DynamicForm config={config} label="Assign bot" submitLabel="Assign bot" onSuccess={onSaved}
    onSubmittingChange={onSubmittingChange} onSubmit={async (values) => {
      try { await mutation.assign(values); return { status: "success" } }
      catch (error: unknown) { return { status: "error", message: normalizeApiError(error).message } }
    }} />
}
