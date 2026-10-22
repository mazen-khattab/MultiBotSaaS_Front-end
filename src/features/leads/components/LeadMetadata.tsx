import { cn } from "@/shared/lib/utils";

/** Metadata keys come from each lead, including keys added or renamed later. */
function fieldLabel(key: string) {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  const label = words.replace(/\bid\b/gi, "ID");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function MetadataValue({
  value,
  depth = 0,
}: {
  readonly value: unknown;
  readonly depth?: number;
}) {
  if (value === null)
    return <span className="text-muted-foreground">Not provided</span>;
  if (typeof value === "boolean") return <span>{value ? "Yes" : "No"}</span>;
  if (typeof value !== "object")
    return (
      <p dir="auto" className="whitespace-pre-wrap [overflow-wrap:anywhere]">
        {String(value) || "—"}
      </p>
    );
  // Keep deeply nested content readable without creating an unbounded DOM tree.
  if (depth >= 6)
    return (
      <pre
        dir="auto"
        className="whitespace-pre-wrap font-mono [overflow-wrap:anywhere]"
      >
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  if (Array.isArray(value))
    return value.length ? (
      <ol className="list-decimal space-y-3 pl-5">
        {value.map((item, index) => (
          <li key={index} className="min-w-0">
            <MetadataValue value={item} depth={depth + 1} />
          </li>
        ))}
      </ol>
    ) : (
      <span className="text-muted-foreground">No items</span>
    );

  const entries = Object.entries(value);
  return entries.length ? (
    <dl className="grid min-w-0 gap-4 sm:grid-cols-2">
      {entries.map(([key, item]) => (
        <div
          key={key}
          className={cn(
            "min-w-0 space-y-2 rounded-lg border bg-background/40 p-4",
            ((typeof item === "object" && item !== null) ||
              (typeof item === "string" &&
                (item.length > 120 || item.includes("\n")))) &&
              "sm:col-span-2",
          )}
        >
          <dt
            title={key}
            className="text-sm font-medium text-muted-foreground [overflow-wrap:anywhere]"
          >
            {fieldLabel(key)}
          </dt>
          <dd className="min-w-0 text-sm leading-7">
            <MetadataValue value={item} depth={depth + 1} />
          </dd>
        </div>
      ))}
    </dl>
  ) : (
    <span className="text-muted-foreground">No additional details.</span>
  );
}

export function LeadMetadata({
  metadataJson,
}: {
  readonly metadataJson: string | null;
}) {
  if (!metadataJson?.trim())
    return (
      <p className="text-sm text-muted-foreground">No additional details.</p>
    );
  let metadata: unknown;
  try {
    metadata = JSON.parse(metadataJson);
  } catch {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          These details could not be formatted. The original content is shown
          below.
        </p>
        <p
          dir="auto"
          className="whitespace-pre-wrap leading-7 [overflow-wrap:anywhere]"
        >
          {metadataJson}
        </p>
      </div>
    );
  }
  return <MetadataValue value={metadata} />;
}
