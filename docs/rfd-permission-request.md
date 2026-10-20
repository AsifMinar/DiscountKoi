# Permission request: RedFlagDeals Hot Deals feed

The RFD source (`scraper/sources/rfd-hot-deals.ts`) is built and tested but **switched off**.
Turn it on only after VerticalScope says yes in writing, and keep their reply.

## Where to send it

VerticalScope (RFD's owner) doesn't publish a licensing email that we could confirm:

1. **Best:** the contact form at https://www.verticalscope.com/contact (open it in a normal browser;
   it blocks automated tools). Choose a business, partnership or licensing option if there is one.
2. **Or:** RFD's own "Contact Us" page (link at the bottom of https://www.redflagdeals.com).
3. **If neither answers within two weeks:** ir@verticalscope.com. It's their published
   investor/media contact, so ask them to forward it to whoever handles content licensing.

Why ask first: RFD's terms of use couldn't be read (the site shows a bot check to automated
tools), and VerticalScope licenses its content and acts against unlicensed scraping. Its robots.txt
doesn't block the feed for our bot, but robots.txt isn't permission under the terms.

---

## The email (ready to send)

**Subject:** Permission request: linking to RFD Hot Deals threads from a free Sudbury deals site

Hello,

My name is Asif Minar. I run **Discount Koi** (https://asifminar.github.io/DiscountKoi/), a small,
free website that gathers deals, student discounts and free events for people in Greater Sudbury,
Ontario. It has no ads, no accounts and no tracking.

Many of the best Canadian deals are posted on the RedFlagDeals **Hot Deals** forum. I'd like your
permission to list them on Discount Koi in a way that sends readers to RFD:

**What I'd use:** only your public Atom feed for the Hot Deals forum
(https://forums.redflagdeals.com/feed/forum/9). From each entry I'd take the **thread title, its
link and its publish date**, plus the store name and price when they're written in the title.

**What I would not use:** post text, images, comments, usernames or anything behind a login.

**How it would look:** a small card with the title, a credit line reading
**"via RedFlagDeals.com Hot Deals forum"**, and a button that opens the original RFD thread in a new
tab. Readers would have to visit RFD for the details and the discussion.

**How it would be fetched:**

- At most **once a day** (6 AM Eastern), one request to the feed.
- An honest user agent that links to the project: `DiscountKoiBot/1.0 (+https://github.com/AsifMinar/DiscountKoi)`.
- It respects your robots.txt and caching headers, and stops for the day if the feed says no or
  rate-limits it. It never works around a block or bot check.
- Nothing is used to train AI models, and nothing is resold or shared with third parties.

**About money:** Discount Koi is free to use. In the future some retailer deals from other sources may
carry clearly labelled affiliate links, but RFD listings would never be monetized in any way.

I'd be glad to follow any conditions you prefer: a different credit line, your logo, a limit on how
many threads are shown, or a different feed. I can also send you a preview before anything goes
live. If you'd rather I didn't use the feed at all, that's completely fine and I won't.

You can see exactly how the feed would be read in the open-source code:
https://github.com/AsifMinar/DiscountKoi/blob/main/scraper/sources/rfd-hot-deals.ts

Thank you for considering it.

Best regards,
Asif Minar
Discount Koi, Sudbury, Ontario
https://asifminar.github.io/DiscountKoi/

---

## If they say yes

1. Save their reply (for example as a PDF in a private folder; don't commit it).
2. Apply any conditions they set (credit wording, limits) to `scraper/sources/rfd-hot-deals.ts`.
3. Change `enabled: false` to `enabled: true` in that file, run `npm test`, then commit and push.

## If they say no, or don't answer

Leave it switched off. Don't fetch the feed.
