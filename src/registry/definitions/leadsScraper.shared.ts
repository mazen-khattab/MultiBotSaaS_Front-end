import { History, ListChecks, Send, Target, UsersRound } from "lucide-react";
import { createElement, lazy, type ComponentType } from "react";
import type { FieldValues } from "react-hook-form";

import type {
  BotModuleDefinition,
  BotTabComponentProps,
  BotTabDefinition,
} from "@/registry/botRegistry.types";
import type { RunsPageConfig } from "@/registry/configs/runsConfig.types";
import type { GroupsPageConfig } from "@/registry/configs/groupsConfig.types";

/** These flags describe implemented pages, never subscriptions or API permissions. */
export interface LeadsScraperCapabilities {
  readonly supportsGroups: boolean;
  readonly supportsLeads: boolean;
  readonly supportsRuns: boolean;
}

/** Keep the module's field schema, parsed values, and serializer typed together. */
export type LeadsScraperModuleConfig<
  TInput extends FieldValues,
  TOutput extends FieldValues = TInput,
> = Omit<LeadsScraperCapabilities, "supportsRuns"> & {
  readonly uiModuleCode: string;
  readonly groupsConfig?: GroupsPageConfig;
} & (
    | {
        readonly supportsRuns: true;
        readonly runsConfig: RunsPageConfig<TInput, TOutput>;
      }
    | { readonly supportsRuns: false; readonly runsConfig?: never }
  );

export interface LeadsScraperModuleDefinition extends BotModuleDefinition {
  readonly scraperCapabilities: LeadsScraperCapabilities;
}

const ConnectedAccountsPage = lazy(
  () => import("@/features/connected-accounts/pages/ConnectedAccountsPage"),
);
const LeadsPage = lazy(() => import("@/features/leads/pages/LeadsPage"));
const MessagingPreviewPage = lazy(
  () => import("@/features/leads/pages/MessagingPreviewPage"),
);

/** Compose existing feature pages without fetching data or registering a code. */
export function defineLeadsScraperModule<
  TInput extends FieldValues = Record<string, unknown>,
  TOutput extends FieldValues = TInput,
>(
  config: LeadsScraperModuleConfig<TInput, TOutput>,
): LeadsScraperModuleDefinition {
  const scraperCapabilities = Object.freeze({
    supportsGroups: config.supportsGroups,
    supportsLeads: config.supportsLeads,
    supportsRuns: config.supportsRuns,
  });
  const tabs: BotTabDefinition[] = [];
  const runsConfig = config.runsConfig;
  if (config.supportsRuns && runsConfig) {
    // Bind the typed module config before crossing the generic routing boundary.
    // Importing the renderer stays lazy; resolving a module never loads its page.
    const RunsPage = lazy<ComponentType<BotTabComponentProps>>(async () => {
      const groupOptionsProvider =
        runsConfig.startRun?.targetGroupOptionsProvider;
      if (groupOptionsProvider) {
        const { default: GroupRunsPage } =
          await import("@/features/runs/pages/GroupRunsPage");
        return {
          default: function ScraperGroupRunsPage({
            botId,
            view,
          }: BotTabComponentProps) {
            return createElement(GroupRunsPage<TInput, TOutput>, {
              botId,
              config: runsConfig,
              groupOptionsProvider,
              view,
            });
          },
        };
      }
      const { default: GenericRunsPage } =
        await import("@/features/runs/pages/GenericRunsPage");
      return {
        default: function ScraperRunsPage({
          botId,
          view,
        }: BotTabComponentProps) {
          return createElement(GenericRunsPage<TInput, TOutput>, {
            botId,
            config: runsConfig,
            view,
          });
        },
      };
    });
    tabs.push({
      slug: "runs",
      label: "Runs",
      icon: History,
      component: RunsPage,
      config: runsConfig,
    });
  }
  // Account management is common to this family. Feature services receive the
  // current route's botId and own their existing request and cache behavior.
  tabs.push({
    slug: "connected-accounts",
    label: "Connected accounts",
    icon: UsersRound,
    component: ConnectedAccountsPage,
  });
  if (config.supportsGroups) {
    const GroupsPage = lazy(async () => {
      const { default: GenericGroupsPage } =
        await import("@/features/groups/pages/GroupsPage");
      return {
        default: function ScraperGroupsPage({ botId }: BotTabComponentProps) {
          return createElement(GenericGroupsPage, {
            botId,
            config: config.groupsConfig,
          });
        },
      };
    });
    tabs.push({
      slug: "groups",
      label: "Target groups",
      icon: Target,
      component: GroupsPage,
      config: config.groupsConfig,
    });
  }
  if (config.supportsLeads) {
    // Preserve Part 17's separate preview route and navigation from the list.
    tabs.push({
      slug: "leads",
      label: "Leads",
      icon: ListChecks,
      component: LeadsPage,
    });
    tabs.push({
      slug: "messaging-preview",
      label: "Available leads",
      icon: Send,
      component: MessagingPreviewPage,
    });
  }
  const sidebarTabs = Object.freeze(tabs.map((tab) => Object.freeze(tab)));
  const pageConfigs: NonNullable<BotModuleDefinition["pageConfigs"]> = {
    ...(config.supportsRuns && runsConfig ? { runs: runsConfig } : {}),
    ...(config.supportsGroups && config.groupsConfig
      ? { groups: config.groupsConfig }
      : {}),
  };
  return Object.freeze({
    uiModuleCode: config.uiModuleCode,
    scraperCapabilities,
    sidebarTabs,
    pageConfigs: Object.freeze(pageConfigs),
    // Omitted capabilities also stay unresolved when reached by a direct URL.
    resolveComponent: (slug: string) =>
      sidebarTabs.find((tab) => tab.slug === slug)?.component,
  });
}
