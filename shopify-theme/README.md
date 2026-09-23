# Oak & Lily Shopify Theme Conversion

This folder is a Shopify Online Store 2.0 Liquid theme converted from the local Oak & Lily clone.

## What Is Included

- Liquid layout: `layout/theme.liquid`
- Header/footer section groups
- Home hero and featured collection
- Collection, product, cart, page, blog, article, and search templates
- Bundle builder page template: `templates/page.bundle.json`
- Oak & Lily visual styling in `assets/oak-theme.css`
- Shopify-native product forms, Ajax cart drawer, cart page, and checkout
- Responsive header, hero, product grids, collection/search states, and footer

## Shopify Setup Notes

1. Upload `oak-lily-shopify-theme.zip` in Shopify Admin:
   `Online Store > Themes > Add theme > Upload zip file`.
2. Open the theme customizer.
3. Set the logo, hero image, menus, and collection selections.
4. For the bundle page, create a Shopify page and assign the `bundle` theme template.
5. Make sure products and collections exist in Shopify before publishing.
6. Preview the uploaded theme on desktop, tablet, and mobile before publishing.

## Important

The static clone used local JSON and localStorage cart behavior. This Liquid theme uses Shopify products, variants, Ajax cart endpoints, and Shopify checkout instead.
