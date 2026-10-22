import BotTabRoutePage from "./BotTabRoutePage"

/** Resolve creation through the same owned workspace and registered Runs tab. */
export default function BotStartRunRoutePage() {
  return <BotTabRoutePage tabSlug="runs" view="start-run" />
}
