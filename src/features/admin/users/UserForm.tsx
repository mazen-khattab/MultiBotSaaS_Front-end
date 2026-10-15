import { useMemo } from "react"
import { z } from "zod"

import { normalizeApiError } from "@/core/api/apiError"
import { DynamicForm } from "@/shared/components/dynamic-form/DynamicForm"
import type { DynamicFormConfig } from "@/shared/components/dynamic-form/dynamicForm.types"
import { useAdminUserMutations } from "./useAdminUsers"
import { updateAdminUserSchema, type AdminUser } from "./users.types"

type UserFormValues = z.infer<typeof updateAdminUserSchema> & { password: string }

/** User profiles have no role editor; initial passwords exist only on creation. */
export function UserForm({ user, onSaved, onSubmittingChange }: {
  readonly user?: AdminUser
  readonly onSaved: () => void
  readonly onSubmittingChange: (busy: boolean) => void
}) {
  const mutation = useAdminUserMutations()
  const config = useMemo<DynamicFormConfig<UserFormValues>>(() => ({
    schema: updateAdminUserSchema.extend({ password: z.string() }).refine((value) => Boolean(user) || value.password.trim().length > 0,
      { path: ["password"], message: "Enter an initial password." }),
    defaultValues: { fullName: user?.fullName ?? "", email: user?.email ?? "", phoneNumber: user?.phoneNumber ?? "", password: "" },
    fields: [
      { name: "fullName", type: "text", label: "Full name", required: true },
      { name: "email", type: "text", label: "Email", required: true },
      { name: "phoneNumber", type: "text", label: "Phone number" },
      { name: "password", type: "text", label: "Initial password", sensitive: true, autoComplete: "new-password", visible: !user, required: !user },
    ],
  }), [user])
  return <DynamicForm config={config} label={user ? "Edit user" : "Create user"} submitLabel="Save user"
    onSubmittingChange={onSubmittingChange} onSuccess={onSaved}
    onSubmit={async (values) => {
      const profile = { fullName: values.fullName, email: values.email, phoneNumber: values.phoneNumber }
      try {
        if (user) await mutation.update(user.id, profile)
        else await mutation.create({ ...profile, password: values.password })
        return { status: "success" }
      } catch (error: unknown) { return { status: "error", message: normalizeApiError(error).message } }
      finally { values.password = "" }
    }} />
}
