# Pruvious v4 — TODO

## Rich Text & Editor Fields

- Add focused block breadcrumbs below iframe (only if one block is selected)
- Handle pasting HTML:
  - Break down into simple factors
  - Remove double line breaks and trim spaces
  - Normalize as much as possible
  - Try to transform URLs into internal `rel://` links (check `window.location.origin` and pathname)
- `editorField` (instead of text field, provides more options for marks and toolbar)
  - Also create a classic editor field using ProseMirror for normal field layout and mirror the view in `RichText.vue`
- Allow `textarea` field to be used as editable text
  - Handle `\n` instead of `<br>` (only if `allowLineBreaks` is enabled)
  - Introduce new `RichText.vue` prop (`br` or `\n`)
- Disable soft breaks for text fields
- Disable all marks and links for text and textarea fields
- Don't show toolbar for text and textarea fields
- Test `<EditableText />` with normal collection and singleton fields
- Handle links in rich text
- Stub `Table.vue` block

## Rich Text Field Definition

- `richTextField`:
  - `marks` (`Record<string, Mark>`):
    - `tag` (defaults to `span`)
    - `class` (`string | string[]`)
    - `attributes` (`Record<string, string | CustomMarkAttribute>`)
    - `icon`, `label`, `description`
  - `toolbar`: `bold`, `italic`, `underline`, `code`, `link`, `toggleMark:{mark}`, dropdowns
  - `placeholder`
- `editorField`: same as `richTextField` plus additional toolbar items and separators
- Sanitize HTML on server when saving rich text or editor field

## Link Field

- ~~Create `linkField` and `linksField`~~ (done — see `rel://` protocol)
- Use `nullableObjectFieldModel` to include `target`, `rel`, etc.
- Populate if routed (resolve final absolute path or nullify if resource doesn't exist)
- Use same path logic in rich text editors (handle `target` and `rel` separately as HTML attrs)

## Database & ORM

- Migrations: allow writing something on server start > lock DB > do migration > unlock, but log somewhere to not attempt again
  - Do on every server start
- Database locking/unlocking methods:
  - Create methods for locking and unlocking the database (for external API syncs)
  - Query builders should wait for the database to unlock (implement at ORM level, not in the database class)
  - Write tests: lock DB, put a waiting query in `Promise.all`, add a transaction query with ~250-300ms sleep
  - `startTransaction` query builder method (also a standalone exported function)
    - Single parameter: timeout (0 = manual end, default)
    - Second option: wait duration while DB is locked + poll interval
    - Accept options as a single object parameter
  - `endTransaction` function (takes the object returned by `startTransaction`)
  - `usingTransaction` method on non-select query builders (takes `startTransaction` result)
  - `awaitUnlock` query builder method (params: timeout, poll interval with sensible defaults)
  - Helper functions: `isDatabaseLocked()`, `getCurrentTransaction()` — export from server
- Allow `paginate()` to accept same params as `paged()` (or rename to `paginated()`?)

## Collections & Fields

- Add filters for manipulating data in collection/singleton edit/create after change but before save
  - Provide changed fields (old + new values) as secondary parameter using field paths
  - Also add filters after saving
- Add `disabled` option for every field (best in the UI option)
- Check if conditional logic works on the same field using dot notation
- Auto-populate path field from other fields (e.g., composing a path from other field values)
- `orderField`:
  - Shifts all existing orders if a record is updated
  - Unique, positive integer
- `colors` field:
  - Define global colors in `nuxt.config.ts` (hex, CSS variable name, dark variant, selector-specific)
  - Show global colors based on current color mode
  - Allow defining multiple colors for variants
  - Contrast colors auto-suggest / color palette / shades
- Handle line breaks (`\n` to `<br>`) in `textarea.table.field`
- Implement `{ trash: true }` — adds `deletedAt` field (nullable)
- Implement `{ drafts: true, revisions: true }` — allow picking fields for revisions
- Smart cropping system for responsive images (portrait vs landscape + screen size) in `imageField`
- Implement `sources` option in `image`/`images` fields (`{ media?, variant: ImageVariant }`)
  - Returns `srcset`, `width`, `height`, `type`, `media` per source

## Import/Export

- Import/export tool for collection records
  - Needs UUID
  - Imports/exports relations

## Passwords & Auth

- Provide hooks for changing the password hashing algorithm
  - Create plugin that uses Argon2
- Document authentication in detail (JWTs, auth strategies, `tokenSubject`, session management)

## Patterns (instead of Presets)

- Allow using `bloxField` from any collection via a new `linkedBlocksField` reference field
- Patterns collection (allows any number of blocks)
- Allow writing pattern description and title
- Pattern block (selects a pattern from collection)
- Allow selecting multiple adjacent blocks to create a pattern
  - Show error if blocks aren't adjacent
- Add option in block fields to detach pattern and edit without sync

## Permissions & Roles

- Test permissions (no one except admins can manage other users currently)
  - In `packages/pruvious/.playground/test/cms/collections/users.ts`
  - Try managing other users without caps (manager role)
  - Create `Director` role with `...AsDirector` test functions
  - Try managing other users with caps (director role)
- Implement default roles when installing Pruvious
- Easy-to-use UI to check all CRUD operations for collections when editing a role
  - Custom component for `permissions` field
  - Hide `collection:{slug}:manage` for collections without `author`/`editors` fields
- `collection:{slug}:publish` permission for page-like collections

## Bulk Editing

- Add option for bulk editing fields (columns) in data table
  - Applies to currently filtered view (display count in popup)
  - Title: "Update **X** records" (with tooltip about timing)
  - `Bulk edit` button > dropdown or single button
    - `Set value` — new popup using edit cell field
    - `Transform` — math operators for numeric fields; prepend/append/replace for string fields
      - Separate popup with descriptions
      - Allow rounding numeric values
  - Validation:
    - Process record-by-record (best option for custom validators)
    - Checkbox to enable/disable validation before update
    - Note: no rollback, stops on first failure
    - Lock primary button during operation, show progress
    - Include dependency fields
  - Use update collection API endpoint
  - On success: toast with updated count, refresh table
  - On failure: popup with table of failed updates (ID, current value, error, link to record)

## Uploads

- Alternative delete routes for uploads (DELETE method doesn't work on Cloudflare)
  - First submit GitHub issue in Nuxt repo with minimal repro
- How to clean unfinished multipart uploads?
  - `defineJob` in `server/jobs/clean-multipart-uploads`
  - Dedicated dashboard page showing locked uploads
  - Detect multipart by checking `multipart != null && multipart != '{}'`
- Allow deleting locked uploads (API endpoint + dashboard page)
- Allow side-loading uploads from URLs
- Custom response headers for upload paths (via hooks or `server/hooks` folder)
  - Default expiration headers (see best standards)
  - Allow setting individual headers per mime type, extension, or directory
- Need option to set cache TTL for S3 buckets and regular uploads
  - Allow default TTLs via module options using globs, extensions, `mediaCategories`, or MIME types

## Dashboard UI

- General loading indicator in dashboard
- Search fields with `CMD+K` shortcut (don't activate if a popup is open)
- Add swipe left-to-right gesture to open dashboard sidebar (if sidebar slot is active)
- Checkboxes component (with shift selection like in `PUITable`)
- Add descriptions to labels in log detail popups
  - Same descriptions as data table header tooltips
  - `tableColumnDescription` field option (mirrors `description` when `true`, defaults to `false`)
- Add reload (data) and flush buttons in log overview pages + live-reload (poll interval)
- Add user in log detail popup (use preview component from record field)
- Implement lock when somebody is editing a collection record or singleton
- Allow entering time with freestyle keyboard input in datetime popup
- Show sync lock warning (`Database.lock`) and unlock action in dashboard header
  - Maybe connect with site health
- Create helpers `resolveCollectionMenuItem` and `resolveSingletonMenuItem`
- Dashboard overview page
- Dashboard (color) themes with CSS variables (store preference in user record)
- Show other user activity in dashboard (like Sanity/Figma)

## SEO & Site Health

- Implement other fields (beyond General tab) in SEO singleton
- Handle SEO population in routes (social media images)
- Site health checks:
  - Broken links
  - Missing SEO descriptions
  - List all images missing descriptions in any language
  - Show as widget on dashboard overview
- GET `/api/pruvious/database-cleanup` (retrieves non-collection tables and non-field columns)
- POST `/api/pruvious/database-cleanup` (drop non-collection tables, drop non-field columns)
- AI-powered SEO suggestions (title, description based on content)
  - Configurable fine-tuning options
- AI-suggested field values

## Translation

- Create default translation function (`copyTranslationDefault`) defined in collections
  - Traverse all fields, resolve translated record IDs for relational fields
  - Create separately so users can integrate in their own logic
  - Create a "Traverse Fields" helper
  - Populate `author` field (if enabled) with current user
- AI translation version:
  - `{ copyTranslation: copyTranslationAI({ model, apiKey?, instructions }) }`
  - Maybe use existing AI modules for Nuxt

## Page Caching

- `pageCache` option:
  - `include`: path glob, debounce, timeout, queryString handling (ignore/separate/baseOnly/string[])
  - `exclude`: glob patterns
  - Always ignore `__d` and `__p` query strings (draft/preview tokens)
  - Write to `Cache` table or Redis (with `pending` column)
  - Log all cache operations
- `collection.pageCacheClearTriggers`:
  - Default: `{ create: ['**'], update: ['**'], delete: ['**'] }` (except Users/Roles)
  - Implement as automated collection hooks
- Permissions: `clear-page-cache` with dashboard UI (clear all / rebuild gradually)
  - API endpoints and utilities: `clearPageCache()`, `rebuildPageCache()`
  - Dynamic column in Pages overview showing cached status
- Cloudflare cache investigation (`globalThis.caches.default`)

## Logging & Analytics

- Logs > Router > Analytics
  - Update in `packages/pruvious/server/pruvious-api/routes/[...].get.ts`
- `pause-logs` permission with toggle in dashboard header
- Log stuff from login route (maybe with IP for security)
- Rate limiter

## Post-Deploy Integrity Validation

- Set hash on build, compare against record/singleton `_integrity` column
- On mismatch: validate row, update fields (set defaults), update `_integrity`
- Implement in ORM query builder (select `_integrity` every time)
- Implement in all 4 query builders
- Delete QB should just not update after returning
- Only check when fields are returned
- Always remove `_integrity` from returned fields
- Always verify integrity in dev mode
- Log integrity checks and errors in integrity column of query logs
- Provide module option to enable/disable in prod/dev

## Themes & Typography

- Themes:
  - Timeless (Website UI)
  - Infinity (Headless UI)
  - PUI (Dashboard UI)
- Create `@pruvious/typography` with standard prose blocks and `commonMarks`
  - Ask user during project creation if they want it as a plugin or customized files
  - Provide toolbar/marks config in the package
- Default user roles and blocks (prose, paragraph, etc.)
  - Ask user what they want from defaults when installing via CLI

## CLI & Tooling

- `create-pruvious-plugin` wizard:
  - Plugin name, description
  - Whether options exist in `nuxt.config.ts` (module directory)
  - Stubs (prose blocks)
- Add fancy "Next steps" border and Pruvious logo to `cli-utils` (also in `hub` CLI)
- `add update` command
- Show if updates available in `list` command
- Show if updates available in `hub-app` UI
- `create-pruvious` package should strictly follow `pruvious` versions — create release script
- Use `npx nypm install` for dependency installation
  - Add `@iconify-json/tabler` as dependency
  - Resolve dependency versions by sniffing from `pruvious` package using `mlly`
- `npx pruvious reproduction [hash]` — copy local project to remote server (without `.env` files)
  - Isolated dev environment with VS Code in browser
  - Requires GitHub login
- `npx pruvious init --[blank|boilerplate|demo|tutorial]`
  - Tutorial includes lessons/videos guiding user to build demo
- Note somewhere that this monorepo needs `pnpm bootstrap` before `pnpm i`
- Update pnpm to latest and test if it works (check corepack error with `npm create nuxt`)
- Figure out how to whitelist the `sharp` build automatically

## Hub App

- Logo
- Different color scheme for dashboard

## Testing & Platform

- Test this monorepo on Windows
- Generally test dev/build and Pruvious apps and CLIs
- Bun and Deno support?

## Deployment & Infrastructure

- Fix `Mime.js` warnings when deploying to Cloudflare (fork the mime library)
- Document that D1 has max 100 columns per table limit
- Document that Node 24 is minimum
- Deployment guides (Vercel, Netlify)
- Figure out how to disable existing server routes via Nuxt (and document)

## Exports & Type Filtering

- Add `sometimes` filters for each `#pruvious/*` export (type and const)
  - e.g., `Permission`, `LanguageCode`, `iconNames`, `collections`

## Documentation

- Write notice in upload docs about moved directories returning potentially stale IDs
- Document `resolvePruviousComponent` / `resolveNamedPruviousComponent`
- Document preset fields in collections (author field, duplicating, copy to translation, etc.)
- Document use of `withCustomContextData({ event })` for logging queries
- Document Verdaccio and `pnpm play`, `PRIVATE_REGISTRY_BASE_URL`, and other `.env.test` variables
- Explain query builder chaining (mutable instance, use factory for multiple queries)
- Provide source code and test utils in docs for all `@pruvious/utils`
- Add `@see` to all options
- Add docs for custom `CollectionUIOptions.layout` and `SingletonUIOptions.layout` components
- Add docs for custom `FieldsLayoutComponentItem` components
- Search documentation feature on website (like Sanity)
- Highlight all visible TOC items in docs (like Nuxt docs)
- Simple end-user documentation for using the dashboard with examples and images
- Fill in missing documentation in `packages/orm/README.md`

## Much More Internal Hooks

- Need many more internal action and filter hooks

## Floating Pruvious Button

- For logged-in users: edit page, open dashboard, etc.
- In dev mode: shows documentation callable with `CMD+K` (disableable in settings)
- Opens dropdown with options
- Smart position based on screen quadrants (stores position in user options)

## Development Menu

- Show all defined hooks (actions and filters) and where they're used
- Show all defined blocks
- Allow creating blocks (define fields, icon, etc., fancy `<pre>` output like Timber `dump`)
- Allow creating custom components (field components, table components, etc.) with presets
- Allow creating collections and singletons (with field layout builder)
- Allow creating custom fields (including config and custom components)

---

## ALPHA (February)

- Showcase "made with Pruvious" community sites
- Code editor component `PUICodeEditor` (CodeMirror? check [shikicode](https://github.com/magic-akari/shikicode))
- `PUICode` — add `maxHeight` and `expandLabel` with expand button
- Allow unlocking DB sync lock from dashboard header
- Create `app/icons` folder (customizable) for SVGs (use component magic like `svgo`)

## RELEASE (June)

- Website homepage with dynamic PUI blocks to showcase features
  - Maybe create lazy-loaded query builder demo
- Visual query builder in dashboard (community request)
  - Allow editing DB stuff as JSON with live validation
  - Add helpers for extracting data with walkers
- Shorten `pkg.pr.new` URLs (check `--compact` option)
- Join logos for pkg.pr.new
- Code of conduct
- Sharing image generator with canvas in dashboard (maybe automated with SSR)
  - Allow custom Vue component templates
- Custom sorting in data table (like Directus)
- After deploying new website, update old links in GitHub issues and Discord to `v3.pruvious.com`

## BACKLOG

- Resolve image sources for `<PruviousPicture />` — calculate correct size when `fit` is `contain`
  - Based on aspect ratio and rotate value; check enlargement behavior (Sharp vs CFI)
- Try resolving [#56](https://github.com/pruvious/pruvious/issues/56#issuecomment-2597016676) in v4 with real UI libraries
- Allow copy/pasting pages (with related uploads, use hash for uploads)
- Figure out how to disable collections (ban names from `nuxt.config.ts` or create empty collections file)
- Layout transitions in Nuxt page meta ([#99](https://github.com/pruvious/pruvious/issues/99))
- Delete branch `feat/rich-text` (check if everything is migrated first)

## General Ideas

- Label all GitHub issues with `v3` and `v4`
- Pruvious v4 announcement video
- The core packages don't depend on Nuxt — encourages other frameworks
- Documentation with logic flow + Cookbook references
- Allow hooking by key handles like `field:validators:beforeThrow`
- Fully interactive tutorial with live code, deep dives, and user feedback
- Query builder live code examples in docs (sandbox/playground)
- "Suggest improvements" form per doc page (with optional email for updates)
- Image resizing tool with enhanced UX and `@nuxt/image`
- Blog post: "Implementing User Authentication with Cloudflare Workers"
- Color field should always return an object with selectable props (hex, alpha, rgba, r, g, b, hsl, hsla, h, s, l, label, name)
- Basic and Advanced tutorials covering general use cases and building on top of Pruvious
