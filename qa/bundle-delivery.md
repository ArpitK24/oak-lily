# Local Build Your Bundle delivery

Route: `/bundle` (served by the existing static server).

## Implemented

- Desktop and mobile header links next to Gifts, and an additional homepage banner immediately below the unchanged hero.
- 110 captured products, local imagery, category filters, variant selection, availability, current captured prices and compare-at prices where captured.
- Dynamic summary with quantities, removal, active tier, subtotal, savings and final total.
- 0–1 units: no discount; exactly 2: 10%; 3 or more: 15%. No three-item cap or further tiers. Each selected variant unit counts once, including variants sold as sets.
- Line totals use integer paise. Each line's discount is rounded to the nearest paise; subtotal minus the sum of those discounts is the final total.
- Desktop/tablet grid and sticky scrollable summary; mobile stacked summary with a sticky access link and return-to-products link.
- Unfinished selections survive refresh in sessionStorage. This is only a draft, not a separate cart.

## Existing cart integration

`OakLocalCart.addBundle` validates variant IDs against the existing catalog and adds all selected lines through the existing cart's `save()` and drawer renderer. The persisted key remains `oak-lily-cart` in localStorage. A `bundleId` groups qualifying lines. Quantity changes and removal recalculate each bundle's discount. Ordinary purchases remain separate full-price lines, even when they use the same variant as a bundle. The drawer retains its existing layout and adds bundle labels and savings.

## Catalog recovery

The existing catalog omitted variants already present in the saved product pages. The recovery script appended 160 missing records with their captured IDs, prices and availability. Existing products and records were retained. Gift cards and the one product without usable captured variant data are not offered in the builder. No live catalog, external API, app, database, payment or authentication integration was added.

## Browser QA

Playwright Chromium ran against the local server. Missing browser libraries were extracted under `/tmp/oak-browser-libs`; no project dependency or system package configuration was changed.

Passed at **390px, 768px and 1440px**:

- Header navigation and homepage banner route to `/bundle`.
- Product and variant rendering, selected variant prices, disabled unavailable products and filters.
- 1, 2, 3 and 4 units; exact 10%/15% savings, subtotal and final total.
- Quantity decrease, removal and saved selection after refresh.
- Add bundle to existing drawer/cart, cart quantity updates and persisted cart data.
- Normal purchase of an identical variant remains separate and undiscounted.
- Removing bundle lines recalculates discounts without affecting ordinary purchases.
- No horizontal page overflow, JavaScript exceptions or failed local HTTP requests in the tested flow. Captured CSS and replica.css returned 200.
- Account modal opens at all widths; existing header height is unchanged.

The existing `scripts/test.mjs` regression suite also passed (search, product navigation, variants, cart addition/quantity/removal/persistence, and mobile menu navigation).

Screenshots were reviewed for all three widths. A controlled Spring Sales hero comparison with bundle additions removed from the DOM passed at all widths. Images retained identical dimensions; mean per-channel differences were below 0.04 on the 0–255 scale (a boundary row). This is a controlled comparison, not a historical Git baseline.

## Scope and limitations

`replica.css`, captured CSS assets, `server.mjs`, the hero and existing page content were not intentionally changed. Captured HTML files received only the necessary navigation link; the homepage also received the banner. Shopify-only work from the initial approach was removed.

The implementation is recorded in Git commits `df92a46` and `4dccc8e`. See `bundle-changed-files.txt` for the feature file inventory. The final continuation also restores the missing `scripts/validate.mjs` used by `npm run build`.

This remains a local functional replica. Catalog inventory is captured data, and checkout retains the existing non-payment behavior. No external service is required for bundles.

## Re-run

From the project directory:

```sh
npm run dev
LD_LIBRARY_PATH=/tmp/oak-browser-libs/extracted/usr/lib/x86_64-linux-gnu node scripts/qa-bundle-full.mjs
LD_LIBRARY_PATH=/tmp/oak-browser-libs/extracted/usr/lib/x86_64-linux-gnu node scripts/qa-bundle-preservation.mjs
LD_LIBRARY_PATH=/tmp/oak-browser-libs/extracted/usr/lib/x86_64-linux-gnu npm test
```

The temporary library path is only needed in this environment. On a machine with Playwright dependencies installed, omit it.
