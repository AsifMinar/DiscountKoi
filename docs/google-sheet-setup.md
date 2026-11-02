# Weekly picks from a Google Sheet

Type this week's flyer prices into a Google Sheet on your phone or computer. Every morning the
scraper reads the sheet and puts the products on the site (Products page, deal cards, shopping
list). It's the same as `npm run add-pick`, just quicker.

## Set it up (once, about 5 minutes)

1. Open **https://sheets.google.com** and sign in with your Google account.
2. **File → Import → Upload**, and choose `docs/picks-sheet-template.csv` from this project.
   Pick **"Replace spreadsheet"** and click **Import data**. You now have the right columns and
   three example rows.
3. **File → Share → Publish to web.**
   - Under "Link", choose the sheet (usually **Sheet1**), not "Entire document".
   - Choose **Comma-separated values (.csv)**.
   - Click **Publish**, then **OK**.
   - Copy the link. It looks like `https://docs.google.com/spreadsheets/d/e/2PACX-…/pub?gid=0&single=true&output=csv`.
4. Open `data/picks-sheet.json` in this project and paste the link between the quotes of `"csvUrl"`:
   ```json
   "csvUrl": "https://docs.google.com/spreadsheets/d/e/2PACX-…/pub?gid=0&single=true&output=csv"
   ```
5. Commit and push (`git pull`, `git add -A`, `git commit -m "Link picks sheet"`, `git push`).

From then on you never touch the code: just edit the sheet. Changes show up after the next morning
run, or right away if you start **Actions → Daily scrape → Run workflow** on GitHub.

Anyone with the link can read the sheet, so only put flyer prices in it.

## The columns

Only **Store**, **Product** and **Price** are needed. Leave the rest empty when you don't know them.

| Column        | What to type                                                             | Example                 |
| ------------- | ------------------------------------------------------------------------ | ----------------------- |
| Store         | The store, written like in `data/flyer-stores.json`                      | `No Frills`             |
| Product       | The product in your own words                                            | `Large eggs`            |
| Price         | The sale price                                                           | `3.97`                  |
| Per           | `package` (or empty), `lb`, `kg` or `100g` for things sold by weight     | `lb`                    |
| Size          | The package size, for package prices                                     | `dozen`, `4 L`, `400 g` |
| Regular price | The regular price, if the flyer shows it                                 | `5.29`                  |
| First day     | `YYYY-MM-DD`. Empty: the start of the store's current flyer week         | `2026-10-29`            |
| Last day      | `YYYY-MM-DD`. Empty: the end of the store's current flyer week           | `2026-11-04`            |
| Brand         | The brand, if it matters                                                 | `Natrel`                |
| Category      | Empty means grocery. Otherwise one of the ids in `shared/taxonomy.ts`    | `health-beauty`         |
| Barcode       | The numbers under the barcode (spaces are fine). Shows the product photo | `0 60383 12345 5`       |
| Note          | A short line in your own words                                           | `Limit 2 per customer`  |
| Link          | Only if the store isn't in `flyer-stores.json`: its official flyer page  | `https://…`             |

- Old rows (whose last day has passed) are simply ignored. Delete them whenever you like.
- A row with a mistake is skipped, and the Actions log says which row and why, e.g.
  `skipped row 7: the sale price must be a number`.
- **Photos:** with a barcode, the scraper looks the product up on Open Food Facts (once per
  barcode) and shows its photo, credited to Open Food Facts. No barcode: the card shows the
  category icon.
