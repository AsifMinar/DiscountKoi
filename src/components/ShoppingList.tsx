"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { Deal } from "@shared/deal";
import { groupProducts, productKey, searchProducts } from "@shared/products";
import { offersFor, planShopping, type Plan } from "@shared/shopping";
import { DealModal } from "@/components/DealModal";
import { EmptyState } from "@/components/EmptyState";
import { CloseIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { isExpired } from "@/lib/filters";
import { formatPrice, plural } from "@/lib/format";
import { shoppingList } from "@/lib/local-lists";
import { dealHref, onDealClick, useSearchString, useToday } from "@/lib/url-state";
import { useAllDeals } from "@/lib/use-all-deals";

const money = (n: number) => formatPrice(n);

/** One plan: its total, then what to buy at each store. */
function PlanCard({
  title,
  plan,
  itemCount,
  note,
  search,
}: {
  title: string;
  plan: Plan;
  itemCount: number;
  note?: string;
  search: string;
}) {
  const byStore = plan.stores
    .map((store) => ({ store, picks: plan.picks.filter((p) => p.offer.store === store) }))
    .filter((s) => s.picks.length);
  return (
    <GlassCard as="article" className="flex flex-col gap-4 p-5">
      <header className="flex flex-col gap-1">
        <h3 className="text-sm font-medium text-ink-muted">{title}</h3>
        <p className="text-3xl font-semibold tracking-tight tabular-nums">{money(plan.total)}</p>
        <p className="text-sm text-pretty text-ink-muted">
          {plan.stores.join(" + ")} · {plan.picks.length} of {plural(itemCount, "item")}
          {note && ` · ${note}`}
        </p>
      </header>
      {byStore.map(({ store, picks }) => (
        <div key={store} className="flex flex-col gap-1 border-t border-line pt-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Avatar name={store} className="size-6 text-[0.625rem]" />
            {store}
          </p>
          <ul className="flex flex-col">
            {picks.map(({ item, offer }) => (
              <li key={item}>
                <a
                  href={dealHref(search, offer.deal.id)}
                  onClick={onDealClick(offer.deal.id)}
                  className="-mx-2 flex min-h-11 items-center justify-between gap-3 rounded-xl px-2 text-sm hover:bg-neutral-soft"
                >
                  <span className="min-w-0 truncate">
                    {item}
                    {offer.deal.size && (
                      <span className="text-ink-muted"> · {offer.deal.size}</span>
                    )}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {money(offer.price)}
                    {offer.deal.unit && !offer.deal.size && offer.deal.unit !== "each"
                      ? `/${offer.deal.unit === "100g" ? "100 g" : offer.deal.unit}`
                      : ""}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {plan.missing.length > 0 && (
        <p className="text-xs text-pretty text-ink-muted">
          Not at {plan.stores.length === 1 ? "this store" : "these stores"}:{" "}
          {plan.missing.join(", ")}
        </p>
      )}
    </GlassCard>
  );
}

/**
 * The shopping list: add products, and see which store (or two stores) is cheapest for
 * the whole list this week. The list lives in this browser only.
 */
export function ShoppingList({ buildDay }: { buildDay: string }) {
  const names = shoppingList.useList();
  const today = useToday(buildDay);
  const search = useSearchString();
  const { deals: allDeals, failed } = useAllDeals();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);

  const products: Deal[] = useMemo(
    () => (allDeals ?? []).filter((d) => d.productName && !d.sample && !isExpired(d, today)),
    [allDeals, today],
  );
  const groups = useMemo(() => groupProducts(products), [products]);
  const byKey = useMemo(() => new Map(groups.map((g) => [g.key, g])), [groups]);
  const onList = useMemo(() => new Set(names.map(productKey)), [names]);

  const items = useMemo(
    () => names.map((name) => ({ name, offers: offersFor(byKey.get(productKey(name))) })),
    [names, byKey],
  );
  const plans = useMemo(() => planShopping(items), [items]);
  const suggestions = deferred.trim()
    ? searchProducts(groups, deferred)
        .filter((g) => !onList.has(g.key))
        .slice(0, 6)
    : [];

  const best = plans.oneStore[0];
  const saving = (plan: Plan) =>
    best && plan.picks.length === best.picks.length && best.total - plan.total >= 0.01
      ? `saves ${money(best.total - plan.total)}`
      : undefined;

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="add-heading" className="flex flex-col gap-4">
        <h2 id="add-heading" className="text-xl font-semibold tracking-tight">
          Add products
        </h2>
        {allDeals && groups.length === 0 ? (
          <EmptyState
            title="No product prices this week yet"
            action={<ButtonLink href="/">Browse this week&apos;s flyers</ButtonLink>}
          >
            Once this week&apos;s store prices are in, you can add them here and see which store is
            cheapest for your whole list.
          </EmptyState>
        ) : (
          <>
            <label className="flex h-14 w-full max-w-xl items-center gap-3 rounded-full glass-strong pr-1.5 pl-5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
              <SearchIcon className="size-5 shrink-0 text-ink-muted" />
              <span className="sr-only">Find a product to add</span>
              <input
                type="search"
                autoComplete="off"
                maxLength={60}
                placeholder="Find a product: milk, eggs, chicken…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-full w-full min-w-0 bg-transparent text-base text-ink placeholder:text-ink-muted focus:outline-none [&::-webkit-search-cancel-button]:hidden"
              />
            </label>
            {suggestions.length > 0 && (
              <ul className="flex max-w-xl flex-col gap-1" aria-label="Products found">
                {suggestions.map((g) => (
                  <li key={g.key}>
                    <button
                      type="button"
                      onClick={() => {
                        shoppingList.toggle(g.name);
                        setQuery("");
                      }}
                      className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left hover:bg-neutral-soft"
                    >
                      <PlusIcon className="size-4 shrink-0 text-ink-muted" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{g.name}</span>
                      <span className="text-xs text-ink-muted">
                        from {money(offersFor(g)[0]?.price ?? 0)} · {plural(g.stores, "store")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {deferred.trim() && suggestions.length === 0 && allDeals && (
              <p className="text-sm text-ink-muted">
                No product matches &ldquo;{deferred.trim()}&rdquo; this week.
              </p>
            )}
          </>
        )}
        {failed && (
          <p className="text-sm text-ink-muted">
            This week&apos;s prices couldn&apos;t load. Check your connection and reload.
          </p>
        )}
      </section>

      <section aria-labelledby="list-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="list-heading" className="text-xl font-semibold tracking-tight">
              Your list
            </h2>
            <p className="mt-0.5 text-sm text-ink-muted">{plural(names.length, "item")}</p>
          </div>
          {names.length > 0 && (
            <Button variant="ghost" onClick={shoppingList.clear}>
              Clear list
            </Button>
          )}
        </div>
        {names.length === 0 ? (
          <p className="text-sm text-pretty text-ink-muted">
            Your list is empty. Add products above, or tap &ldquo;Add to list&rdquo; on the Products
            page. The list stays on this device only.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map(({ name, offers }) => (
              <li
                key={name}
                className="flex min-h-14 items-center gap-3 rounded-2xl glass py-2 pr-2 pl-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <p className="text-xs text-ink-muted">
                    {offers.length
                      ? `From ${money(offers[0].price)} at ${offers[0].store} · ${plural(offers.length, "store")}`
                      : allDeals
                        ? "Not on sale this week"
                        : "Loading prices…"}
                  </p>
                </div>
                {offers.length === 0 && allDeals && <Badge tone="outline">No price</Badge>}
                <button
                  type="button"
                  aria-label={`Remove ${name}`}
                  onClick={() => shoppingList.toggle(name)}
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-neutral-soft hover:text-ink"
                >
                  <CloseIcon className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {best && (
        <section aria-labelledby="plans-heading" className="flex flex-col gap-4">
          <div>
            <h2 id="plans-heading" className="text-xl font-semibold tracking-tight">
              Where to buy it
            </h2>
            <p className="mt-0.5 text-sm text-pretty text-ink-muted">
              Each item at its listed price: one package, or 1 lb/kg for items sold by weight.
              Package sizes can differ between stores, so check the size before you go.
            </p>
          </div>
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
            <PlanCard
              title="Cheapest at one store"
              plan={best}
              itemCount={names.length}
              search={search}
            />
            {plans.twoStores && (
              <PlanCard
                title="Cheapest at two stores"
                plan={plans.twoStores}
                itemCount={names.length}
                note={saving(plans.twoStores)}
                search={search}
              />
            )}
            {plans.cheapest.stores.length > (plans.twoStores ? 2 : 1) && (
              <PlanCard
                title="Cheapest of all (every store)"
                plan={plans.cheapest}
                itemCount={names.length}
                note={saving(plans.cheapest)}
                search={search}
              />
            )}
          </div>
          {plans.oneStore.length > 1 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">Every store for your list</h3>
              <ul className="flex flex-col gap-1">
                {plans.oneStore.map((plan) => (
                  <li
                    key={plan.stores[0]}
                    className="flex min-h-12 items-center gap-3 rounded-2xl border border-line px-3"
                  >
                    <Avatar name={plan.stores[0]} className="size-8 text-xs" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {plan.stores[0]}
                    </span>
                    <span className="text-xs text-ink-muted">
                      {plan.picks.length} of {names.length}
                    </span>
                    <span className="w-20 text-right text-sm font-semibold tabular-nums">
                      {money(plan.total)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <DealModal allDeals={allDeals} initialDeals={[]} failed={failed} today={today} />
    </div>
  );
}
