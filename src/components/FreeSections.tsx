"use client";

import { useId, useMemo } from "react";
import { DealExplorer, type DealExplorerProps } from "@/components/DealExplorer";
import { EmptyState } from "@/components/EmptyState";
import { ArrowUpRightIcon } from "@/components/icons";
import { Button, externalLinkProps } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/cn";
import { fold } from "@/lib/filters";
import type { FoodProgram, FoodProgramGroup } from "@/lib/food-help";
import { plural } from "@/lib/format";
import { navigateSearch, useFilters, useSearchString } from "@/lib/url-state";

/*
 * The Free page in two parts: freebies and events (the usual deal list) and the food
 * help directory. Which one shows lives in the URL (?show=food-help), so it can be
 * shared as a link and the Back button works.
 */

const FOOD_TAB = "food-help";

const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, "");

function useTab() {
  const tab = new URLSearchParams(useSearchString()).get("show") === FOOD_TAB ? "food" : "free";
  const setTab = (next: "free" | "food") => {
    const params = new URLSearchParams(window.location.search);
    if (next === "food") params.set("show", FOOD_TAB);
    else params.delete("show");
    navigateSearch(params.toString(), "push");
  };
  return [tab, setTab] as const;
}

/** "Freebies & events (7) | Food help (26)" switch, styled like the In store / Online one. */
function TabSwitch({
  tab,
  onChange,
  freeCount,
  foodCount,
}: {
  tab: "free" | "food";
  onChange: (tab: "free" | "food") => void;
  freeCount: number;
  foodCount: number;
}) {
  const name = useId();
  const options = [
    { id: "free", label: "Freebies & events", count: freeCount },
    { id: "food", label: "Food help", count: foodCount },
  ] as const;
  return (
    <div
      role="radiogroup"
      aria-label="Show"
      className="mx-auto flex h-12 w-full max-w-md rounded-full glass p-1"
    >
      {options.map((o) => (
        <label
          key={o.id}
          className={cn(
            "inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 ease-out has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
            tab === o.id ? "bg-ink text-page" : "text-ink-muted hover:text-ink",
          )}
        >
          <input
            type="radio"
            name={name}
            className="sr-only"
            checked={tab === o.id}
            onChange={() => onChange(o.id)}
          />
          {o.label}
          <span className="tabular-nums opacity-70">{o.count}</span>
        </label>
      ))}
    </div>
  );
}

function ProgramCard({ program }: { program: FoodProgram }) {
  return (
    <GlassCard as="article" className="flex h-full flex-col gap-1.5 p-4 sm:p-5">
      <h4 className="text-[0.9375rem] leading-snug font-medium text-pretty">{program.name}</h4>
      {program.address && <p className="text-sm">{program.address}</p>}
      {program.notes && (
        <p className="line-clamp-4 text-sm text-pretty text-ink-muted">{program.notes}</p>
      )}
      <a
        href={program.url}
        {...externalLinkProps()}
        className="-mx-2 mt-auto inline-flex min-h-11 items-center gap-1.5 self-start rounded-full px-2 text-sm font-medium text-accent-text hover:bg-neutral-soft"
      >
        {hostOf(program.url)}
        <ArrowUpRightIcon aria-hidden="true" className="size-4" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </GlassCard>
  );
}

/** Food banks, meal programs and Good Food Box locations, grouped by kind. */
function FoodHelpDirectory({ groups, credit }: { groups: FoodProgramGroup[]; credit?: string }) {
  const [filters, update] = useFilters();
  const shown = useMemo(() => {
    const words = fold(filters.q).split(/\s+/).filter(Boolean);
    return groups
      .map((g) => ({
        ...g,
        programs: g.programs.filter((p) => {
          const text = fold(`${p.name} ${p.address} ${p.notes} ${g.label}`);
          return words.every((w) => text.includes(w));
        }),
      }))
      .filter((g) => g.programs.length > 0);
  }, [groups, filters.q]);

  return (
    <section
      id="deals"
      aria-labelledby="food-help-heading"
      className="flex scroll-mt-28 flex-col gap-8"
    >
      <div>
        <h2 id="food-help-heading" className="text-xl font-semibold tracking-tight">
          Food help in Sudbury
        </h2>
        <p className="mt-0.5 text-sm text-pretty text-ink-muted">
          Free food banks and meal programs, and Good Food Box locations for affordable produce.
          Hours can change, so check with the program before you go.
        </p>
      </div>

      {shown.length === 0 && (
        <EmptyState
          title="No food programs match your search"
          action={<Button onClick={() => update({ q: "" })}>Clear search</Button>}
        >
          Try a different word, like a street or neighbourhood.
        </EmptyState>
      )}

      {shown.map((group) => (
        <section key={group.label} aria-label={group.label} className="flex flex-col gap-3">
          <h3 className="text-base font-semibold tracking-tight">
            {group.label}{" "}
            <span className="font-normal text-ink-muted">
              · {plural(group.programs.length, "place")}
            </span>
          </h3>
          <ul role="list" className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
            {group.programs.map((program) => (
              <li key={program.id}>
                <ProgramCard program={program} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {credit && <p className="text-xs text-ink-muted">{credit}</p>}
    </section>
  );
}

export function FreeSections({
  explorer,
  foodHelp,
  foodHelpCredit,
}: {
  explorer: DealExplorerProps;
  foodHelp: FoodProgramGroup[];
  foodHelpCredit?: string;
}) {
  const [tab, setTab] = useTab();
  const foodCount = foodHelp.reduce((n, g) => n + g.programs.length, 0);
  return (
    <div className="flex flex-col gap-10">
      {foodCount > 0 && (
        <TabSwitch tab={tab} onChange={setTab} freeCount={explorer.total} foodCount={foodCount} />
      )}
      {tab === "food" && foodCount > 0 ? (
        <FoodHelpDirectory groups={foodHelp} credit={foodHelpCredit} />
      ) : (
        <DealExplorer {...explorer} />
      )}
    </div>
  );
}
