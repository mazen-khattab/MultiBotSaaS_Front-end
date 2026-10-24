import { useLocation } from "react-router-dom";
import { Suspense } from "react";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { beforeEach, expect, test, vi } from "vitest";

import { postScraperRunAdapter } from "@/features/bot-modules/post-scraper/postScraperRunAdapter";
import { postScraperRunSchema } from "@/features/bot-modules/post-scraper/postScraperRunSchema";
import { botModulesRegistry } from "@/registry/botModulesRegistry";
import {
  accountDto,
  apiFailure,
  apiOrigin,
  apiPage,
  apiSuccess,
} from "@/test/fixtures/api.fixtures";
import { server } from "@/test/mocks/server";
import { renderWithProviders } from "@/test/renderWithProviders";

const RegisteredRunsPage =
  botModulesRegistry["FB-POSTS-SCRAPER"]!.resolveComponent("runs")!;

function PostRuns() {
  const location = useLocation();
  return (
    <Suspense fallback={<p>Loading runs…</p>}>
      <RegisteredRunsPage botId="73" view={location.pathname.endsWith("/runs/start") ? "start-run" : undefined} />
    </Suspense>
  );
}

function CurrentRoute() {
  const location = useLocation();
  return <output aria-label="Current route">{location.pathname}</output>;
}

test("a direct start-page visit shows every field in sections, and Cancel returns to Runs without a write", async () => {
  const writes = vi.fn();
  server.use(http.post(`${apiOrigin}/api/v1/scrapes`, () => {
    writes();
    return HttpResponse.json(apiSuccess(42));
  }));
  const { user } = renderWithProviders(<><PostRuns /><CurrentRoute /></>, { route: "/dashboard/bots/73/runs/start" });
  const page = within(await screen.findByRole("region", { name: "Start Post Scraper" }));
  await waitFor(() => expect(page.getByLabelText("Connected account")).toBeEnabled());
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  for (const title of ["Account and target group", "Collection settings", "AI instructions"]) {
    expect(page.getByRole("region", { name: title })).toBeInTheDocument();
  }
  for (const label of ["Connected account", "Target group", "Search term", "Posts count", "Post description", "Analyze profile posts prompt", "AI message structure"]) {
    expect(page.getByLabelText(label)).toBeInTheDocument();
  }
  await user.type(page.getByLabelText("Search term"), "Unsubmitted settings");
  await user.click(page.getByRole("button", { name: "Cancel" }));
  expect(screen.getByLabelText("Current route")).toHaveTextContent("/dashboard/bots/73/runs");
  expect(screen.queryByRole("form", { name: "Start Post Scraper" })).not.toBeInTheDocument();
  expect(writes).not.toHaveBeenCalled();
});

beforeEach(() => {
  server.use(
    http.get(`${apiOrigin}/api/v1/scrapes`, () =>
      HttpResponse.json(apiSuccess(apiPage([]))),
    ),
  );
});

async function openRunForm() {
  const view = renderWithProviders(<PostRuns />, {
    route: "/dashboard/bots/73/runs",
  });
  const start = await screen.findByRole(
    "button",
    { name: "Start run" },
    { timeout: 5000 },
  );
  await waitFor(() => expect(start).toBeEnabled());
  await view.user.click(start);
  const runPage = within(
    await screen.findByRole("region", { name: "Start Post Scraper" }),
  );
  await waitFor(() =>
    expect(runPage.getByLabelText("Target group")).toBeEnabled(),
  );
  return { ...view, runPage };
}

test("registered Post Scraper sends custom fields as infoJson and refreshes history and account eligibility", async () => {
  const writes = vi.fn();
  const historyReads = vi.fn();
  const accountReads = vi.fn();
  let created = false;
  let sentInfoJson = "";
  server.use(
    http.get(`${apiOrigin}/api/v1/scrapes`, ({ request }) => {
      const params = new URL(request.url).searchParams;
      expect(params.get("botId")).toBe("73");
      historyReads();
      return HttpResponse.json(
        apiSuccess(
          apiPage(
            created
              ? [
                  {
                    id: 42,
                    botId: 73,
                    accountId: 12,
                    groupId: null,
                    collectedLeadsCount: 0,
                    infoJson: sentInfoJson,
                    startedAt: "2026-10-16T12:00:00Z",
                    endedAt: null,
                    status: "Running",
                  },
                ]
              : [],
          ),
        ),
      );
    }),
    http.get(
      `${apiOrigin}/api/v1/connectedaccounts/eligible/scraping/73`,
      () => {
        accountReads();
        return HttpResponse.json(apiSuccess(created ? [] : [accountDto]));
      },
    ),
    http.post(`${apiOrigin}/api/v1/scrapes`, async ({ request }) => {
      expect(request.credentials).toBe("include");
      expect(request.headers.has("Authorization")).toBe(false);
      const body = (await request.json()) as { infoJson: string };
      writes(body);
      sentInfoJson = body.infoJson;
      created = true;
      return HttpResponse.json(apiSuccess(42));
    }),
  );
  const { user, runPage } = await openRunForm();
  expect(writes).not.toHaveBeenCalled();
  expect(runPage.getByLabelText("Posts count")).toHaveValue(10);
  await user.selectOptions(runPage.getByLabelText("Connected account"), "12");
  await user.selectOptions(runPage.getByLabelText("Target group"), "5");
  await user.type(runPage.getByLabelText("Search term"), "  software  ");
  await user.clear(runPage.getByLabelText("Posts count"));
  await user.type(runPage.getByLabelText("Posts count"), "250");
  for (const label of [
    "Post description",
    "Analyze profile posts prompt",
  ]) {
    expect(runPage.getByLabelText(label).tagName).toBe("TEXTAREA");
    expect(runPage.getByLabelText(label)).toHaveValue("");
  }
  await user.click(runPage.getByLabelText("Post description"));
  await user.paste('Posts about "software"\nKeep relevant context.');
  await user.click(runPage.getByLabelText("Analyze profile posts prompt"));
  await user.paste("Summarize the author's posts.");
  await user.click(runPage.getByLabelText("AI message structure"));
  await user.paste("Structure about the ai message.");
  await user.click(runPage.getByRole("button", { name: "Start run" }));
  expect(
    await screen.findByText("Run #42 started successfully."),
  ).toBeInTheDocument();
  expect(screen.queryByRole("form", { name: "Start Post Scraper" })).not.toBeInTheDocument();
  expect(writes).toHaveBeenCalledExactlyOnceWith({
    botId: 73,
    connectedAccountId: 12,
    targetGroupId: 5,
    infoJson: JSON.stringify({
      searchTerm: "software",
      postsCount: 250,
      postDescription: 'Posts about "software"\nKeep relevant context.',
      analyzieProfilePrompt: "Summarize the author's posts.",
      aiMessageStructure: "Structure about the ai message."
    }),
  });
  expect(
    await screen.findByRole("button", { name: "Cancel run #42" }),
  ).toBeInTheDocument();
  expect(historyReads.mock.calls.length).toBeGreaterThanOrEqual(2);
  expect(accountReads.mock.calls.length).toBeGreaterThanOrEqual(2);
  expect(screen.getByRole("button", { name: "Start run" })).toBeEnabled();
});

test.each([
  ["", "Enter the posts count."],
  ["0", "Enter at least 1 post."],
  ["1.5", "Enter a whole number."],
  ["1001", "Enter no more than 1000 posts."],
])(
  "invalid result limit %j prevents a create request",
  async (limit, message) => {
    const writes = vi.fn();
    server.use(
      http.post(`${apiOrigin}/api/v1/scrapes`, () => {
        writes();
        return HttpResponse.json(apiSuccess(42));
      }),
    );
    const { user, runPage } = await openRunForm();
    await user.selectOptions(runPage.getByLabelText("Connected account"), "12");
    await user.selectOptions(runPage.getByLabelText("Target group"), "5");
    await user.type(runPage.getByLabelText("Search term"), "software");
    await user.clear(runPage.getByLabelText("Posts count"));
    if (limit) await user.type(runPage.getByLabelText("Posts count"), limit);
    await user.click(runPage.getByRole("button", { name: "Start run" }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(writes).not.toHaveBeenCalled();
    expect(screen.getByRole("form", { name: "Start Post Scraper" })).toBeInTheDocument();
  },
);

test("account and nonblank search term are required before submission", async () => {
  const writes = vi.fn();
  server.use(
    http.post(`${apiOrigin}/api/v1/scrapes`, () => {
      writes();
      return HttpResponse.json(apiSuccess(42));
    }),
  );
  const { user, runPage } = await openRunForm();
  await user.type(runPage.getByLabelText("Search term"), "   ");
  await user.click(runPage.getByRole("button", { name: "Start run" }));
  expect(
    await screen.findByText("Choose a connected account."),
  ).toBeInTheDocument();
  expect(screen.getByText("Enter a search term.")).toBeInTheDocument();
  expect(writes).not.toHaveBeenCalled();
});

test("a cooldown rejection preserves settings and permits an explicit retry", async () => {
  const writes = vi.fn();
  let reject = true;
  server.use(
    http.post(`${apiOrigin}/api/v1/scrapes`, async ({ request }) => {
      writes(await request.json());
      return reject
        ? HttpResponse.json(
            apiFailure(429, "Bot is on cooldown.", "/api/v1/scrapes", "POST"),
            { status: 429 },
          )
        : HttpResponse.json(apiSuccess(42));
    }),
  );
  const { user, runPage } = await openRunForm();
  await user.selectOptions(runPage.getByLabelText("Connected account"), "12");
  await user.selectOptions(runPage.getByLabelText("Target group"), "5");
  await user.type(runPage.getByLabelText("Search term"), "software");
  await user.type(runPage.getByLabelText("Post description"), "Relevant posts");
  await user.type(
    runPage.getByLabelText("Analyze profile posts prompt"),
    "Find interests",
  );
  await user.click(runPage.getByRole("button", { name: "Start run" }));
  expect(await screen.findByText(/Bot is on cooldown/)).toBeInTheDocument();
  expect(runPage.getByLabelText("Connected account")).toHaveValue("12");
  expect(runPage.getByLabelText("Target group")).toHaveValue("5");
  expect(runPage.getByLabelText("Search term")).toHaveValue("software");
  expect(runPage.getByLabelText("Posts count")).toHaveValue(10);
  expect(runPage.getByLabelText("Post description")).toHaveValue(
    "Relevant posts",
  );
  expect(runPage.getByLabelText("Analyze profile posts prompt")).toHaveValue(
    "Find interests",
  );
  expect(writes).toHaveBeenCalledTimes(1);
  reject = false;
  await user.click(runPage.getByRole("button", { name: "Start run" }));
  expect(
    await screen.findByText("Run #42 started successfully."),
  ).toBeInTheDocument();
  expect(writes).toHaveBeenCalledTimes(2);
});

test("pending creation prevents duplicate requests and dismissal", async () => {
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const writes = vi.fn();
  server.use(
    http.post(`${apiOrigin}/api/v1/scrapes`, async ({ request }) => {
      writes(await request.json());
      await pending;
      return HttpResponse.json(apiSuccess(42));
    }),
  );
  const { user, runPage } = await openRunForm();
  await user.selectOptions(runPage.getByLabelText("Connected account"), "12");
  await user.selectOptions(runPage.getByLabelText("Target group"), "5");
  await user.type(runPage.getByLabelText("Search term"), "software");
  const form = runPage.getByRole("form", { name: "Start Post Scraper" });
  fireEvent.submit(form);
  fireEvent.submit(form);
  try {
    await waitFor(() => expect(writes).toHaveBeenCalledTimes(1));
    expect(
      runPage.getByRole("button", { name: "Starting run…" }),
    ).toBeDisabled();
    expect(runPage.getByRole("button", { name: "Back to runs" })).toBeDisabled();
    expect(runPage.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("form", { name: "Start Post Scraper" })).toBeInTheDocument();
  } finally {
    finish();
  }
  expect(
    await screen.findByText("Run #42 started successfully."),
  ).toBeInTheDocument();
});

test("no eligible accounts leaves the form accessible with guidance and blocks submission", async () => {
  server.use(
    http.get(`${apiOrigin}/api/v1/connectedaccounts/eligible/scraping/73`, () =>
      HttpResponse.json(apiSuccess([])),
    ),
  );
  const { user } = renderWithProviders(<PostRuns />);
  await user.click(await screen.findByRole("button", { name: "Start run" }));
  expect(
    await screen.findByText(
      "No eligible connected accounts are available for this bot.",
    ),
  ).toBeInTheDocument();
  const runPage = within(
    await screen.findByRole("region", { name: "Start Post Scraper" }),
  );
  expect(runPage.getByRole("button", { name: "Start run" })).toBeDisabled();
  expect(
    runPage.getByRole("link", { name: "Manage connected accounts" }),
  ).toHaveAttribute("href", "/dashboard/bots/73/connected-accounts");
  expect(
    runPage.getByRole("button", { name: "Refresh accounts" }),
  ).toBeEnabled();
});

test("metadata extraction rejects unknown historical shapes and account IDs", () => {
  const { serializeInfoJson, extractInfoJson } = postScraperRunAdapter.adapter;
  const metadata = {
    searchTerm: " software ",
    postsCount: 1,
    postDescription: "",
    analyzieProfilePrompt: "",
    aiMessageStructure: "",
  };
  const json = serializeInfoJson(metadata);
  expect(JSON.parse(json)).toEqual({ ...metadata, searchTerm: "software" });
  expect(extractInfoJson(json)).toEqual({
    ...metadata,
    searchTerm: "software",
  });
  for (const invalidMetadata of [
    "{}",
    "bad JSON",
    "null",
    "[]",
    '{"keywords":["software"]}',
    '{"searchTerm":"software","maxResults":1}',
    JSON.stringify({ ...metadata, accountId: 12 }),
  ]) {
    expect(extractInfoJson(invalidMetadata)).toBeUndefined();
  }
  expect(
    postScraperRunSchema.safeParse({
      ...metadata,
      accountId: "2147483648",
      targetGroupId: "5",
    }).success,
  ).toBe(false);
});
