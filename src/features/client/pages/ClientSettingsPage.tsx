import { useAuth } from "@/context/auth/useAuth"
import { BackendCapabilityNotice } from "@/features/client/components/BackendCapabilityNotice"
import { UserSettingsForm } from "@/features/client/components/UserSettingsForm"
import { useSaveUserSettings, useUserSettings } from "@/features/client/hooks/useUserSettings"
import { canSaveUserSettings } from "@/features/client/services/UserSettingsService"
import { ApiErrorAlert } from "@/shared/components/feedback/ApiErrorAlert"
import { PageContainer } from "@/shared/components/layout/PageContainer"

export default function ClientSettingsPage() {
  const { status, user } = useAuth()
  return (
    <PageContainer>
      <div className="mb-7">
        <p className="text-sm font-semibold text-blue-600">Preferences</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Settings</h2>
      </div>
      {status === "authenticated" && user?.role === "User" ? <SettingsContent /> : (
        <BackendCapabilityNotice title="User settings unavailable" description="Sign in with a regular user account to manage these settings." />
      )}
    </PageContainer>
  )
}

/** Do not start this User-only read from an anonymous or administrative render. */
function SettingsContent() {
  const settings = useUserSettings()
  const mutation = useSaveUserSettings()
  const secure = canSaveUserSettings()
  return <div className="max-w-3xl space-y-4">
    {settings.isPending ? <p role="status">Loading settings…</p> : null}
    <ApiErrorAlert error={settings.error} title="Unable to load current settings" retrying={settings.isFetching}
      onRetry={() => { void settings.refetch() }} />
    {!secure ? <BackendCapabilityNotice title="Saving settings unavailable" description="A secure API connection is required before settings can be saved." /> : null}
    {settings.data && !settings.isError ? <UserSettingsForm settings={settings.data} save={mutation.save}
      disabled={!secure || mutation.isPending || settings.isFetching} /> : null}
  </div>
}

