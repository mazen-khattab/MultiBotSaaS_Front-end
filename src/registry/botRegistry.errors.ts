/** A local composition failure, independent of HTTP errors and entitlement. */
export class UnsupportedBotModuleError extends Error {
  override readonly name = "UnsupportedBotModuleError"
  readonly kind = "unsupported-module" as const

  constructor(readonly uiModuleCode: string) {
    super(`No frontend module is registered for UiModuleCode "${uiModuleCode}".`)
  }
}
