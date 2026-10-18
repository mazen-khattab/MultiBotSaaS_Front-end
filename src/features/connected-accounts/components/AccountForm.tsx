import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useRef, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { normalizeApiError } from "@/core/api/apiError";
import { useConnectedAccountMutations } from "@/features/connected-accounts/hooks/useConnectedAccountMutations";
import { canSendAccountCookies } from "@/features/connected-accounts/services/ConnectedAccountsService";
import {
  ACCOUNT_STATUSES,
  ACCOUNT_TYPES,
  type ConnectedAccountDetails,
} from "@/features/connected-accounts/types/connectedAccounts.types";
import { Button } from "@/shared/ui/button";

const metadataSchema = z.object({
  displayName: z.string().trim().min(1, "Enter an account name."),
  platform: z.string().trim().min(1, "Enter a platform."),
  isActive: z.boolean(),
  // Creation does not accept status. Editing requires an explicit selection.
  status: z.union([z.enum(ACCOUNT_STATUSES), z.literal("")]).optional(),
  type: z.enum(ACCOUNT_TYPES)
});
type AccountMetadata = z.infer<typeof metadataSchema>;

/** The secret is an uncontrolled password input, never form state/default data. */
export function AccountForm({
  botId,
  account,
  onSaved,
  onCancel,
  onSubmittingChange,
}: {
  readonly botId: number;
  readonly account?: ConnectedAccountDetails;
  readonly onSaved: () => void;
  readonly onCancel: () => void;
  readonly onSubmittingChange: (submitting: boolean) => void;
}) {
  const id = useId();
  const cookieInput = useRef<HTMLInputElement>(null);
  const locked = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutation = useConnectedAccountMutations();
  const secure = canSendAccountCookies();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountMetadata>({
    resolver: zodResolver(
      metadataSchema.superRefine((values, context) => {
        if (account && !values.status) {
          context.addIssue({
            code: "custom",
            path: ["status"],
            message: "Select an account status.",
          });
        }
      }),
    ),
    defaultValues: {
      displayName: account?.displayName ?? "",
      platform: account?.platform ?? "",
      isActive: account?.isActive ?? true,
      status: account?.status ?? "",
      type: account?.type ?? "Scraping",
    },
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current || !secure) return;
    locked.current = true;
    setSubmitting(true);
    onSubmittingChange(true);
    setError(null);
    try {
      await handleSubmit(async (metadata) => {
        if (account && !metadata.status) return;
        const cookiesPayload = cookieInput.current?.value ?? "";
        // Clear before the request starts, on both success and failure. A retry
        // requires re-entry; submitted cookies never remain visible in the form.
        if (cookieInput.current) cookieInput.current.value = "";
        if (!cookiesPayload.trim()) {
          setError("Enter a cookie payload before saving.");
          return;
        }
        try {
          if (account) {
            if (!metadata.status) return;
            await mutation.update(account.id, {
              displayName: metadata.displayName,
              isActive: metadata.isActive,
              cookiesPayload,
              platform: metadata.platform,
              status: metadata.status,
              type: metadata.type
            });
          } else {
            await mutation.create({
              botId,
              displayName: metadata.displayName,
              platform: metadata.platform,
              cookiesPayload,
              type: metadata.type
            });
          }
          onSaved();
        } catch (failure: unknown) {
          setError(normalizeApiError(failure).message);
        }
      })(event);
    } finally {
      locked.current = false;
      setSubmitting(false);
      onSubmittingChange(false);
    }
  }

  return (
    <form
      aria-label={account ? "Edit connected account" : "Add connected account"}
      aria-busy={submitting}
      onSubmit={submit}
      noValidate
      className="mt-5 space-y-5"
    >
      {!secure ? (
        <p role="alert" className="text-sm text-red-700">
          Configure an HTTPS API URL before submitting account cookies.
        </p>
      ) : null}
      <fieldset disabled={submitting} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor={`${id}-name`} className="text-sm font-medium">
            Account name
          </label>
          <input
            id={`${id}-name`}
            {...register("displayName")}
            aria-invalid={Boolean(errors.displayName)}
            aria-describedby={
              errors.displayName ? `${id}-name-error` : undefined
            }
            className="w-full rounded-lg border p-2"
          />
          {errors.displayName ? (
            <p
              id={`${id}-name-error`}
              role="alert"
              className="text-sm text-red-700"
            >
              {errors.displayName.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-1">
          <label htmlFor={`${id}-platform`} className="text-sm font-medium">
            Platform
          </label>
          <input
            id={`${id}-platform`}
            {...register("platform")}
            aria-invalid={Boolean(errors.platform)}
            aria-describedby={
              errors.platform ? `${id}-platform-error` : undefined
            }
            className="w-full rounded-lg border p-2"
          />
          {errors.platform ? (
            <p
              id={`${id}-platform-error`}
              role="alert"
              className="text-sm text-red-700"
            >
              {errors.platform.message}
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {account ? "" : `New accounts are assigned to bot ${botId}.`}
          </p>
        </div>
        <div className="space-y-1">
          <label htmlFor={`${id}-type`} className="text-sm font-medium">
            Account type
          </label>
          <select
            id={`${id}-type`}
            {...register("type")}
            aria-invalid={Boolean(errors.type)}
            aria-describedby={errors.type ? `${id}-type-error` : undefined}
            className="w-full rounded-lg border p-2"
          >
            <option value="" disabled>
              Select a Type
            </option>
            {ACCOUNT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.type ? (
            <p
              id={`${id}-type-error`}
              role="alert"
              className="text-sm text-red-700"
            >
              {errors.type.message}
            </p>
          ) : null}
        </div>
        {account ? (
          <>
            <div className="space-y-1">
              <label htmlFor={`${id}-status`} className="text-sm font-medium">
                Account status
              </label>
              <select
                id={`${id}-status`}
                {...register("status")}
                aria-invalid={Boolean(errors.status)}
                aria-describedby={
                  errors.status ? `${id}-status-error` : `${id}-status-help`
                }
                className="w-full rounded-lg border p-2"
              >
                <option value="" disabled>
                  Select a status
                </option>
                {ACCOUNT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <p
                id={`${id}-status-help`}
                className="text-sm text-muted-foreground"
              >
                {account.status === undefined
                  ? "The server did not return the current status. "
                  : ""}
                The server validates status changes when you save.
              </p>
              {errors.status ? (
                <p
                  id={`${id}-status-error`}
                  role="alert"
                  className="text-sm text-red-700"
                >
                  {errors.status.message}
                </p>
              ) : null}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("isActive")} />
              Enabled
            </label>
          </>
        ) : null}
        <div className="space-y-1">
          <label htmlFor={`${id}-cookies`} className="text-sm font-medium">
            {account ? "Replacement cookie payload" : "Cookie payload"}
          </label>
          <input
            id={`${id}-cookies`}
            ref={cookieInput}
            type="password"
            autoComplete="off"
            spellCheck={false}
            aria-describedby={`${id}-cookies-help`}
            className="w-full rounded-lg border p-2"
          />
          <p
            id={`${id}-cookies-help`}
            className="text-sm text-muted-foreground"
          >
            Paste the cookie payload required by your platform. It is sent over
            HTTPS and cleared on submission.{" "}
            {account
              ? "The API requires a cookie payload when updating an account."
              : ""}
          </p>
        </div>
      </fieldset>
      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || !secure}>
          {submitting ? "Saving…" : "Save account"}
        </Button>
      </div>
    </form>
  );
}
