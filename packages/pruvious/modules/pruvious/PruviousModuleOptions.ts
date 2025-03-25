import type { DeepRequired } from '@pruvious/utils'

export interface PruviousModuleOptions {
  /**
   * Configuration options for the main database connection.
   *
   * Default behavior:
   *
   * - Uses SQLite with a `database.sqlite` file in the current working directory.
   * - Automatically syncs the collection schema.
   * - Preserves database tables and columns not defined in the collection schema.
   */
  database: {
    /**
     * Specifies the database connection driver.
     *
     * Here are sample connection string formats for supported databases:
     *
     * - **SQLite** - `sqlite://path/to/database.sqlite` (path is relative to current working directory)
     * - **PostgreSQL** - `postgres://username:password@hostname:5432/dbname?ssl=true`
     * - **D1** - `d1://DB` (DB is the binding)
     *
     * @default 'sqlite://database.sqlite'
     */
    driver?: `sqlite://${string}` | `postgres://${string}` | `d1://${string}`

    /**
     * Controls whether to synchronize the database to match the collection models.
     *
     * When set to `true` (default), the database schema is updated to match the collection models.
     * Additionally:
     *
     * - Existing tables not defined in the collection models are preserved.
     * - Existing columns not defined in the field models of the collections are dropped.
     *
     * Provide an object to customize the sync behavior or set to `false` to disable the sync feature.
     *
     * @default true
     */
    sync?:
      | {
          /**
           * Indicates whether to drop existing tables not defined in the collection models.
           *
           * @default false
           */
          dropNonCollectionTables?: boolean

          /**
           * Indicates whether to drop existing columns not defined in the field models of the collections.
           *
           * @default true
           */
          dropNonFieldColumns?: boolean
        }
      | boolean
  }

  /**
   * Configuration options for the API server.
   *
   * Default behavior:
   *
   * - Uses `/api/` as the base path for all Pruvious API endpoints.
   * - Applies the default server middleware to all routes under `/api/`.
   */
  api: {
    /**
     * The base URL path prefix for all Pruvious API endpoints.
     * By default, routes are placed directly under `/api/`.
     *
     * @default '/api/'
     */
    basePath?: string

    /**
     * Configuration options for the server middleware that processes Pruvious API requests.
     *
     * The middleware performs the following operations:
     *
     * - Defines the `event.context.pruvious` object.
     * - Generates and assigns a unique request debug ID to `event.context.pruvious.requestDebugId`.
     * - Determines the request language and assigns it to `event.context.pruvious.language`.
     * - Validates user authentication status and sets the `event.context.pruvious.auth` context.
     * - Parses the request body and populates `event.context.pruvious.input` and `event.context.pruvious.files`.
     * - Logs the request.
     * - Removes expired cache entries.
     * - Initiates the job queue processing sequence.
     *
     * This middleware is applied to all routes starting with `/api/` by default, except for the `/api/process-queue` route
     * and routes starting with `/api/_`.
     */
    middleware?: {
      /**
       * Defines paths to include for middleware processing.
       *
       * Paths are matched using [`zeptomatch`](https://www.npmjs.com/package/zeptomatch).
       * Any trailing slashes in the paths are automatically removed before pattern matching occurs.
       *
       * Note: If you modify `api.basePath`, make sure to update this setting accordingly.
       *
       * @default
       * ['/api/**']
       *
       * @example
       * ```ts
       * [
       *   '/exact-path',
       *   '/prefix/**',
       * ]
       * ```
       */
      include?: string[]

      /**
       * Defines paths to exclude from middleware processing.
       * These exclusion patterns are evaluated after the `include` patterns have been processed.
       *
       * Paths are matched using [`zeptomatch`](https://www.npmjs.com/package/zeptomatch).
       * Any trailing slashes in the paths are automatically removed before pattern matching occurs.
       *
       * @default
       * ['/api/_*', '/api/_*\/**', '/api/process-queue']
       *
       * @example
       * ```ts
       * [
       *   '/exact-path',
       *   '/prefix/**',
       * ]
       * ```
       */
      exclude?: string[]
    }
  }

  /**
   * Configuration options for file uploads and storage.
   *
   * Default behavior:
   *
   * - Uses the local filesystem for file storage.
   *   - Files are stored in the `.uploads` directory in the current working directory.
   * - Serves files from the `/uploads/` URL path.
   *
   * Supported storage drivers:
   *
   * - **Local filesystem** - `fs://path/to/uploads`
   *   - The path is relative to the current working directory.
   * - **Cloudflare R2** - `r2://UPLOADS`
   *   - `UPLOADS` is the binding name of the R2 bucket.
   * - **S3 compatible storage**
   *   - AWS: `s3://AKIAXXXXXXXX:SECRET_KEY@s3.amazonaws.com/my-bucket?region=us-east-1&ssl=true`
   *   - DigitalOcean: `s3://ACCESS_KEY:SECRET_KEY@nyc3.digitaloceanspaces.com/my-bucket?region=nyc3&ssl=true`
   *   - MinIO: `s3://ACCESS_KEY:SECRET_KEY@play.min.io/my-bucket?region=us-east-1`
   *
   * @default
   * { driver: 'fs://.uploads', basePath: '/uploads/', basePath: '/uploads/' }
   */
  uploads: {
    /**
     * The storage driver to use.
     *
     * Available driver options:
     *
     * - **Local filesystem** - `fs://path/to/uploads`
     *   - The path is relative to the current working directory.
     * - **Cloudflare R2** - `r2://UPLOADS`
     *   - `UPLOADS` is the binding name of the R2 bucket.
     * - **S3 compatible storage**
     *   - AWS: `s3://AKIAXXXXXXXX:SECRET_KEY@s3.amazonaws.com/my-bucket?region=us-east-1&ssl=true`
     *   - DigitalOcean: `s3://ACCESS_KEY:SECRET_KEY@nyc3.digitaloceanspaces.com/my-bucket?region=nyc3&ssl=true`
     *   - MinIO: `s3://ACCESS_KEY:SECRET_KEY@play.min.io/my-bucket?region=us-east-1`
     *
     * @default 'fs://.uploads'
     */
    driver?: `fs://${string}` | `r2://${string}` | `s3://${string}`

    /**
     * The base path for serving files from the storage driver.
     * By default, the URL looks like `https://example.com/uploads/image.webp`.
     *
     * @default '/uploads/'
     */
    basePath?: string
  }

  /**
   * Configuration options for caching.
   *
   * Cache is used for:
   *
   * - Invalidating tokens during logout.
   * - Storing rendered page content to improve loading performance.
   * - Handling multipart uploads.
   *
   * Supported cache drivers:
   *
   * - **Main database** - `mainDatabase`
   *   - Creates a `Cache` table to store key-value pairs.
   * - **Redis** - `redis://username:password@hostname:6379/db`
   * - **Separate database**
   *   - `sqlite://path/to/cache.sqlite` (path is relative to the current working directory)
   *   - `postgres://username:password@hostname:5432/dbname?ssl=true`
   *   - `d1://CACHE` (CACHE is the binding)
   *
   * @default
   * { driver: 'mainDatabase', prefix: 'pruvious' }
   */
  cache: {
    /**
     * The cache driver configuration.
     *
     * Supported connection string formats for key-value stores:
     *
     * - **Database** - `mainDatabase` (uses the main database connection)
     *   - Creates a `Cache` table to store key-value pairs.
     * - **Redis** - `redis://username:password@hostname:6379/db`
     * - **Separate database**
     *   - **SQLite** - `sqlite://path/to/cache.sqlite` (path is relative to the current working directory)
     *   - **PostgreSQL** - `postgres://username:password@hostname:5432/dbname?ssl=true`
     *   - **D1** - `d1://CACHE` (CACHE is the binding)
     *
     * @default 'mainDatabase'
     */
    driver?:
      | 'mainDatabase'
      | `sqlite://${string}`
      | `postgres://${string}`
      | `d1://${string}`
      | `redis://${string}`
      | `rediss://${string}`

    /**
     * Defines the prefix string used for namespacing keys in the key-value storage system.
     * All stored keys will follow the pattern `{prefix}:{key}`.
     *
     * Specific cache keys use additional secondary prefixes:
     *
     * - `{prefix}:invalidate:{token}` - Used for invalidating access tokens.
     * - `{prefix}:page:{path}` - Used for caching page content.
     * - `{prefix}:multipart:{id}` - Used for handling multipart uploads.
     *
     * When using built-in cache utilities, this prefix is automatically added to the key.
     *
     * @default 'pruvious'
     */
    prefix?: string
  }

  /**
   * Configuration options for the job queue system.
   *
   * Default behavior:
   *
   * - Uses the main database connection for queue management.
   *   - Creates a `Queue` table to store queued jobs.
   * - Automatically processes queued jobs after each HTTP request.
   *   - Sends a non-blocking POST request to `/api/process-queue`.
   *   - The `/api/process-queue` handler processes jobs sequentially until queue is empty.
   *
   * Supported queue drivers:
   *
   * - **Main database** - `mainDatabase` (uses the main database connection)
   *   - Creates a `Queue` table to store queued jobs.
   * - **Separate database**
   *   - **SQLite** - `sqlite://path/to/queue.sqlite` (path is relative to the current working directory)
   *   - **PostgreSQL** - `postgres://username:password@hostname:5432/dbname?ssl=true`
   *   - **D1** - `d1://QUEUE` (QUEUE is the binding)
   *
   * @default
   * { driver: 'mainDatabase', mode: 'auto', secret: 'random-generated-key' }
   */
  queue: {
    /**
     * The queue driver configuration.
     *
     * Supported connection string formats for queue systems:
     *
     * - **Main database** - `mainDatabase` (uses the main database connection)
     *   - Creates a `Queue` table to store queued jobs.
     * - **Separate database**
     *   - **SQLite** - `sqlite://path/to/queue.sqlite` (path is relative to the current working directory)
     *   - **PostgreSQL** - `postgres://username:password@hostname:5432/dbname?ssl=true`
     *   - **D1** - `d1://QUEUE` (QUEUE is the binding)
     *
     * @default 'mainDatabase'
     */
    driver?: 'mainDatabase' | `sqlite://${string}` | `postgres://${string}` | `d1://${string}`

    /**
     * Determines how the queue processing is triggered.
     *
     * When set to `auto` (default):
     *
     * - A non-blocking POST request to `/api/process-queue` is sent after each HTTP request.
     *   - Uses `event.waitUntil()` for request handling.
     *   - The request is managed by the `api.middleware`.
     * - The `/api/process-queue` handler processes jobs sequentially until queue is empty.
     * - The `/api/process-queue` endpoint is excluded from `api.middleware` (and logging).
     * - Each job's logging is controlled by its individual `log` setting.
     *
     * When set to `manual`:
     *
     * - Queue processing must be triggered externally (e.g., via cron job).
     * - No automatic processing occurs after HTTP requests.
     *
     * @default 'auto'
     */
    mode?: 'auto' | 'manual'

    /**
     * Controls API authentication for the `/api/process-queue` endpoint.
     * Requires the secret to be passed as a `Bearer` token in the `Authorization` header when making POST requests.
     *
     * If not provided, a random key will be automatically generated as the secret key.
     */
    secret?: string
  }

  /**
   * Configuration options for authentication and password hashing.
   *
   * Default behavior:
   *
   * - Uses JWT for session management with default expiration times (4 hours for regular sessions, 7 days for extended sessions).
   * - Checks both `Authorization` header and cookies for auth tokens.
   * - Stores tokens in two separate cookies:
   *   - `{header}.{payload}` - Contains the header and payload sections.
   *   - `{signature}` - Contains the signature portion (HTTP-only).
   * - Uses bcrypt algorithm with 12 rounds for password hashing.
   */
  auth: {
    /**
     * JSON Web Token (JWT) configuration options.
     */
    jwt?: {
      /**
       * Secret key used for signing JWT tokens.
       *
       * Important:
       *
       * - In production, always provide a secure, unique secret.
       * - Minimum recommended length is 32 characters.
       * - Changing this value will invalidate all existing tokens.
       * - If not provided, a random key will be automatically generated as the secret key.
       *
       * @see https://pruvious.com/generate-jwt-secret (@todo set up this link)
       */
      secret?: string

      /**
       * Token expiration times for different session types.
       *
       * @default
       * { default: '4h', extended: '7d' }
       */
      expiration?: {
        /**
         * Regular session token expiration time.
         *
         * Accepts duration string or number of seconds.
         *
         * @default '4h'
         *
         * @example
         * ```ts
         * '1d'  // 1 day
         * 14400 // 4 hours in seconds
         */
        default?: string | number

        /**
         * Extended session token expiration time.
         * Applied when request payload includes `{ remember: true }`.
         *
         * Accepts duration string or number of seconds.
         *
         * @default '7d'
         *
         * @example
         * ```ts
         * '14d'  // 14 days
         * 604800 // 7 days in seconds
         * ```
         */
        extended?: string | number
      }

      /**
       * Additional claims to include in the JWT payload.
       * These will be included in every token.
       *
       * @default {}
       */
      claims?: Record<string, any>
    }

    /**
     * Server-side token resolution configuration.
     * Defines sources and their priority order for extracting authentication tokens from requests.
     *
     * Supported configurations:
     *
     * - String shorthand for single source
     * - Object with detailed source configuration
     * - Array of sources to check in order
     * - Array of detailed source configurations
     *
     * @default
     * [
     *   { source: 'authorizationHeader' },
     *   { source: 'cookies', headerAndPayload: 'token', signature: 'signature' },
     * ]
     *
     * @example
     * ```ts
     * // Use only cookies
     * 'cookies'
     *
     * // Use cookies with custom names
     * { source: 'cookies', headerAndPayload: 'foo', signature: 'bar' }
     *
     * // Check cookies then authorization header
     * ['cookies', 'authorizationHeader']
     * ```
     */
    tokenResolution?:
      | 'authorizationHeader'
      | 'cookies'
      | ServerTokenSource
      | ('authorizationHeader' | 'cookies')[]
      | ServerTokenSource[]

    /**
     * Client-side token storage configuration.
     * Defines how authentication tokens are stored and sent by the client.
     *
     * @default
     * {
     *   storage: 'cookies',
     *   headerAndPayload: {
     *     name: 'token',
     *     httpOnly: true,
     *     secure: 'auto',
     *     sameSite: 'strict',
     *   },
     *   signature: {
     *     name: 'signature',
     *     secure: 'auto',
     *     sameSite: 'strict',
     *   },
     * }
     *
     * @example
     * ```ts
     * // Store token in cookies with default settings
     * 'cookies'
     *
     * // Store token in cookies with custom names
     * { storage: 'cookies', headerAndPayload: { name: 'foo' }, signature: { name: 'bar' } }
     *
     * // Store token in localStorage and send via `Authorization` header
     * { storage: 'localStorage', key: 'token' }
     * ```
     */
    tokenStorage?: 'cookies' | 'localStorage' | ClientTokenStorage

    /**
     * Password hashing configuration options.
     * By default, it uses bcrypt with standard security parameters.
     *
     * @default
     * {
     *   algorithm: 'bcrypt',
     *   bcrypt: { rounds: 12 }
     * }
     */
    hash?: {
      /**
       * The hashing algorithm to use for password encryption.
       *
       * Supported algorithms:
       *
       * - **bcrypt** - Industry standard, balanced security and performance.
       *
       * @default 'bcrypt'
       */
      algorithm?: 'bcrypt'

      /**
       * Configuration options specific to bcrypt.
       */
      bcrypt?: {
        /**
         * Number of rounds used for salt generation.
         * Higher values increase security but also increase computation time.
         *
         * @default 12
         */
        rounds?: number
      }
    }
  }

  /**
   * Configuration options for internationalization and language management.
   *
   * Default behavior:
   *
   * - Uses English as the primary language.
   * - Supports single language setup out of the box.
   * - URL prefixing for non-primary languages (e.g., `/de/page`).
   * - Primary language URLs remain unprefixed by default.
   */
  i18n: {
    /**
     * List of supported languages in the CMS.
     * Each language requires a display name and ISO code.
     *
     * The first language in the array is considered primary unless overridden by `primaryLanguage`.
     *
     * @default
     * [{ name: 'English', code: 'en' }]
     *
     * @example
     * ```ts
     * [
     *   { name: 'English', code: 'en' },
     *   { name: 'Deutsch', code: 'de' },
     *   { name: 'Français', code: 'fr' }
     * ]
     * ```
     */
    languages: {
      /**
       * The display name of the language, typically in its native form.
       * This name is shown in the CMS interface and language switchers.
       *
       * @example
       * 'English'
       * 'Deutsch'
       * 'Español'
       */
      name: string

      /**
       * The ISO language code used in URLs and HTML lang attributes.
       * Should follow [ISO 639-1](https://en.m.wikipedia.org/wiki/List_of_ISO_639_language_codes) format for best compatibility.
       *
       * This code is used for:
       *
       * - URL prefixes (e.g., `/de/page`).
       * - HTML lang attributes.
       * - API language identification.
       *
       * @example
       * 'en'
       * 'de'
       * 'fr'
       */
      code: string
    }[]

    /**
     * The primary language code for the CMS.
     * Must match one of the language codes defined in the `languages` array.
     *
     * The primary language:
     *
     * - Serves as the default language.
     * - Is used for fallback content, unless overridden by `fallbackLanguages`.
     * - By default, doesn't get URL prefixing.
     *
     * If not provided or `null`, the first language in the `languages` array is used as the primary language.
     *
     * @default null
     */
    primaryLanguage?: string | null

    /**
     * Controls URL prefixing behavior for the primary language.
     *
     * When `false` (default):
     *
     * - Primary language: example.com/page
     * - Other languages: example.com/de/page
     *
     * When `true`:
     *
     * - Primary language: example.com/en/page
     * - Other languages: example.com/de/page
     *
     * @default false
     */
    prefixPrimaryLanguage?: boolean

    /**
     * The fallback languages to use when content is not available in the current language.
     * These languages are used in order of appearance until content is found.
     *
     * Use an empty array `[]` to disable fallbacks.
     *
     * If not provided or `null`, the `primaryLanguage` is used as the only fallback.
     *
     * @default null
     *
     * @example
     * ```ts
     * ['de', 'en'] // Fallback to German, then English
     * ['de']       // Fallback to German only
     * []           // Disable fallbacks
     * null         // Use primary language as fallback
     * ```
     */
    fallbackLanguages?: string[] | null

    /**
     * Controls the preloading of translatable strings by domain in the client.
     *
     * For each domain, you can:
     *
     * - Use a boolean to enable/disable all string preloading.
     *   - Note: You can always manually preload strings using the `preloadTranslatableStrings(domain)` utility in your Vue components.
     * - Provide detailed configuration to control which paths trigger string preloading.
     *
     * By default, only the `default` domain is preloaded for all paths.
     *
     * @default
     * {
     *   default: {
     *     include: ['**'],
     *     exclude: [],
     *   }
     * }
     *
     * @example
     * ```ts
     * {
     *   // Preload all `dashboard` translatable strings
     *   dashboard: true,
     *
     *   // Preload `shop` strings only for specific paths
     *   shop: {
     *     include: ['/products/**', '/cart'],
     *     exclude: ['/products/test/**']
     *   },
     *
     *   // Disable preloading for `blog` strings
     *   blog: false
     * }
     * ```
     */
    preloadTranslatableStrings?: Record<
      string,
      | {
          /**
           * Defines paths where translatable strings for this domain should be preloaded.
           *
           * Paths are matched using [`zeptomatch`](https://www.npmjs.com/package/zeptomatch).
           * Any trailing slashes in the paths are automatically removed before pattern matching occurs.
           *
           * When not specified, strings are preloaded for all paths.
           *
           * @default
           * ['**']
           *
           * @example
           * ```ts
           * [
           *   '/products/**', // Preload on all products pages
           *   '/cart',        // Preload on the cart page
           * ]
           * ```
           */
          include?: string[]

          /**
           * Defines paths where translatable strings for this domain should not be preloaded.
           * These patterns are evaluated after the `include` patterns.
           *
           * Paths are matched using [`zeptomatch`](https://www.npmjs.com/package/zeptomatch).
           * Any trailing slashes in the paths are automatically removed before pattern matching occurs.
           *
           * @default
           * []
           *
           * @example
           * ```ts
           * [
           *   '/products/test/**', // Exclude test products
           * ]
           * ```
           */
          exclude?: string[]
        }
      | boolean
    >
  }

  /**
   * Configuration options for the Pruvious dashboard.
   */
  dashboard: {
    /**
     * The base path for the dashboard routes.
     * This defines the URL prefix where the dashboard will be accessible.
     *
     * Use an empty string or `/` to serve the dashboard at the root URL.
     *
     * @default '/dashboard/'
     *
     * @example
     * '/admin/'
     * '/hidden/dashboard/'
     */
    basePath?: string
  }

  /**
   * Configuration options for debugging purposes.
   */
  debug: {
    /**
     * Activates detailed console logging for troubleshooting Pruvious.
     * This option operates independently from other `debug` settings.
     *
     * Verbose mode can be activated during runtime in two ways:
     *
     * - Production - Set `NUXT_PRUVIOUS_DEBUG_VERBOSE=true` environment variable.
     * - Development - Use the `--pruviousVerbose` CLI flag.
     *
     * Warning: Enabling verbose mode in production may expose sensitive data from SQL queries.
     *
     * @default false
     */
    verbose?: boolean

    /**
     * Controls the logging of API requests, responses, and database operations into a dedicated logging database.
     * These logs can be accessed and reviewed through the Pruvious dashboard by administrators and users with the `read-logs` permission.
     *
     * By default, logging functionality is disabled.
     * Set to `true` to activate logging with standard configuration settings.
     * For advanced customization, you can provide a configuration object.
     *
     * @default false
     */
    logs?:
      | boolean
      | {
          /**
           * The database connection driver for storing logs.
           *
           * Here are sample connection string formats for supported databases:
           *
           * - **SQLite** - `sqlite://path/to/logs.sqlite` (path is relative to current working directory)
           * - **PostgreSQL** - `postgres://username:password@hostname:5432/dbname?ssl=true`
           * - **D1** - `d1://LOGS` (LOGS is the binding)
           *
           * @default 'sqlite://logs.sqlite'
           */
          driver?: `sqlite://${string}` | `postgres://${string}` | `d1://${string}`

          /**
           * Configuration options for API request and response logging.
           * These settings control which paths are logged and whether to expose sensitive data.
           *
           * Use `true` or `false` to enable/disable API logging with default settings.
           * For advanced configuration, provide an object with these options:
           *
           * - `include` - Paths to include for logging (default: `['/api/**']`).
           * - `exclude` - Paths to exclude from logging (default: `['/api/_*', '/api/_*\/**', '/api/logs/**']`).
           * - `exposeRequestData` - Whether to log request body inputs and sensitive headers (default: `false`).
           * - `exposeResponseData` - Whether to log response body and sensitive headers (default: `false`).
           *
           * Note: If you modify `api.basePath`, make sure to update the `include` setting accordingly.
           *
           * @default true
           */
          api?:
            | boolean
            | {
                /**
                 * Defines paths to include for logging.
                 *
                 * Paths are matched using [`zeptomatch`](https://www.npmjs.com/package/zeptomatch).
                 * Any trailing slashes in the paths are automatically removed before pattern matching occurs.
                 *
                 * Note: If you modify `api.basePath`, make sure to update this setting accordingly.
                 *
                 * @default
                 * ['/api/**']
                 *
                 * @example
                 * ```ts
                 * [
                 *   '/exact-path',
                 *   '/prefix/**',
                 * ]
                 * ```
                 */
                include?: string[]

                /**
                 * Defines paths to exclude from logging.
                 * These exclusion patterns are evaluated after the `include` patterns have been processed.
                 *
                 * Paths are matched using [`zeptomatch`](https://www.npmjs.com/package/zeptomatch).
                 * Any trailing slashes in the paths are automatically removed before pattern matching occurs.
                 *
                 * @default
                 * ['/api/_*', '/api/_*\/**', '/api/logs/**']
                 *
                 * @example
                 * ```ts
                 * [
                 *   '/exact-path',
                 *   '/prefix/**',
                 * ]
                 * ```
                 */
                exclude?: string[]

                /**
                 * Controls whether to store request body inputs and sensitive headers in log entries.
                 * When disabled (default), values are replaced with their data types.
                 *
                 * Warning: Enabling this will include potentially sensitive information in logs.
                 *
                 * @default false
                 */
                exposeRequestData?: boolean

                /**
                 * Controls whether to store response body values and sensitive headers in log entries.
                 * When disabled (default), values are replaced with their data types.
                 *
                 * Warning: Enabling this will include potentially sensitive information in logs.
                 *
                 * @default false
                 */
                exposeResponseData?: boolean
              }

          /**
           * Controls whether to log queries from the main database.
           * Logged queries can be viewed in the Pruvious dashboard by admins and users with the `read-logs` permission.
           *
           * Use `true` or `false` to enable/disable query logging with default settings.
           * For granular control, use the `logs` option when defining individual collections.
           *
           * Instead of a boolean, you can also provide a configuration object with the following options:
           *
           * - `include` - Paths to include for logging (default: `['**']`).
           * - `exclude` - Paths to exclude from logging (default: `['/api/logs/**']`).
           *
           * @default true
           */
          queries?:
            | boolean
            | {
                /**
                 * Defines paths to include for logging.
                 *
                 * Paths are matched using [`zeptomatch`](https://www.npmjs.com/package/zeptomatch).
                 * Any trailing slashes in the paths are automatically removed before pattern matching occurs.
                 *
                 * @default
                 * ['**']
                 *
                 * @example
                 * ```ts
                 * [
                 *   '/exact-path',
                 *   '/prefix/**',
                 * ]
                 * ```
                 */
                include?: string[]

                /**
                 * Defines paths to exclude from logging.
                 * These exclusion patterns are evaluated after the `include` patterns have been processed.
                 *
                 * Paths are matched using [`zeptomatch`](https://www.npmjs.com/package/zeptomatch).
                 * Any trailing slashes in the paths are automatically removed before pattern matching occurs.
                 *
                 * Note: If you modify `api.basePath`, make sure to update this setting accordingly.
                 *
                 * @default
                 * ['/api/logs/**']
                 *
                 * @example
                 * ```ts
                 * [
                 *   '/exact-path',
                 *   '/prefix/**',
                 * ]
                 * ```
                 */
                exclude?: string[]
              }

          /**
           * Controls whether to log job processing events.
           * These logs can be viewed in the Pruvious dashboard by admins and users with the `read-logs` permission.
           *
           * Use `true` or `false` to enable/disable job logging with default settings.
           * For granular control, use the `logs` option when defining individual jobs.
           *
           * @default true
           */
          queue?: boolean

          /**
           * Controls whether to enable custom logs on the server side using the `insertCustomLog()` function.
           * These logs can be viewed in the Pruvious dashboard by admins and users with the `read-logs` permission.
           *
           * @default true
           *
           * @example
           * ```ts
           * import { insertCustomLog } from '#pruvious/server'
           *
           * await insertCustomLog('New user registered', {
           *   type: 'info',
           *   payload: { email: 'foo@bar.baz' },
           * })
           * ```
           */
          custom?: boolean
        }
  }

  /**
   * Customize the default directory structure used by Pruvious.
   */
  dir: {
    /**
     * Directory paths where Pruvious action hooks are stored.
     *
     * @default
     * { client: 'actions', server: 'actions' }
     */
    actions?: {
      /**
       * Directory path where Pruvious client-side action hooks are stored.
       * This path is relative to the project's `<srcDir>` directory.
       *
       * @default 'actions'
       */
      client?: string

      /**
       * Directory path where Pruvious server-side action hooks are stored.
       * This path is relative to the project's `<serverDir>` directory.
       *
       * @default 'actions'
       */
      server?: string
    }

    /**
     * Directory path where Pruvious API route handlers are stored.
     * This path is relative to the project's `<serverDir>` directory.
     *
     * @default 'pruvious-api'
     */
    api?: string

    /**
     * Directory path where block components are stored.
     * This path is relative to the project's `<srcDir>` directory.
     *
     * @default 'blocks'
     */
    blocks?: string

    /**
     * Directory path where Pruvious build files are stored.
     * This path is relative to the project's `<rootDir>` directory.
     *
     * @default '.pruvious'
     */
    build?: string

    /**
     * Directory path where Pruvious collections are stored.
     * This path is relative to the project's `<serverDir>` directory.
     *
     * @default 'collections'
     */
    collections?: string

    /**
     * Directory path where Pruvious fields are stored.
     *
     * @default
     * { components: 'fields', definitions: 'fields' }
     */
    fields?: {
      /**
       * Directory path where Pruvious field components are stored.
       * This path is relative to the project's `<srcDir>` directory.
       *
       * @default 'fields'
       */
      components?: string

      /**
       * Directory path where Pruvious field definitions are stored.
       * This path is relative to the project's `<serverDir>` directory.
       *
       * @default 'fields'
       */
      definitions?: string
    }

    /**
     * Directory paths where Pruvious filter hooks are stored.
     *
     * @default
     * { client: 'filters', server: 'filters' }
     */
    filters?: {
      /**
       * Directory path where Pruvious client-side filter hooks are stored.
       * This path is relative to the project's `<srcDir>` directory.
       *
       * @default 'filters'
       */
      client?: string

      /**
       * Directory path where Pruvious server-side filter hooks are stored.
       * This path is relative to the project's `<serverDir>` directory.
       *
       * @default 'filters'
       */
      server?: string
    }

    /**
     * Directory paths where Pruvious hook definitions are stored.
     *
     * @default
     * { client: 'hooks', server: 'hooks' }
     */
    hooks?: {
      /**
       * Directory path where Pruvious client-side hook definitions are stored.
       * This path is relative to the project's `<srcDir>` directory.
       *
       * @default 'hooks'
       */
      client?: string

      /**
       * Directory path where Pruvious server-side hook definitions are stored.
       * This path is relative to the project's `<serverDir>` directory.
       *
       * @default 'hooks'
       */
      server?: string
    }

    /**
     * Directory path where job definitions are stored.
     * This path is relative to the project's `<serverDir>` directory.
     *
     * @default 'jobs'
     */
    jobs?: string

    /**
     * Directory path where singletons are stored.
     * This path is relative to the project's `<serverDir>` directory.
     */
    singletons?: string

    /**
     * Directory path where translatable strings are stored.
     * This path is relative to the project's `<serverDir>` directory.
     *
     * @default 'translations'
     */
    translations?: string

    /**
     * Directory path where collection templates are stored.
     * This path is relative to the project's `<serverDir>` directory.
     *
     * @default 'templates'
     */
    templates?: string
  }
}

export type ServerTokenSource =
  | {
      /**
       * Use cookie-based authentication token source.
       *
       * Reads the token from two separate cookies:
       *
       * 1. `{header}.{payload}` - First cookie contains the header and payload sections.
       * 2. `{signature}` - Second cookie contains only the signature portion (HTTP-only).
       *
       * This split-cookie approach helps mitigate XSS attacks by making it harder or malicious scripts to obtain the complete token.
       */
      source: 'cookies'

      /**
       * Cookie name for the first part of the JWT containing `{header}.{payload}`.
       * This is used to store the token metadata and claims.
       *
       * @default 'token'
       */
      headerAndPayload?: string

      /**
       * Cookie name for the second part of the JWT containing `{signature}`.
       * This is used to verify the token's authenticity.
       *
       * @default 'signature'
       */
      signature?: string
    }
  | {
      /**
       * Use `Authorization` header-based authentication token source.
       * Reads the token from the `Authorization` HTTP header in `Bearer` format.
       */
      source: 'authorizationHeader'
    }

export type ClientTokenStorage =
  | {
      /**
       * Store token in cookies.
       *
       * The JWT (JSON Web Token) is automatically split and stored in two separate cookies:
       *
       * 1. `{header}.{payload}` - First cookie contains the header and payload sections.
       * 2. `{signature}` - Second cookie contains only the signature portion (HTTP-only).
       *
       * This split-cookie approach helps mitigate XSS attacks by making it harder or malicious scripts to obtain the complete token.
       */
      storage: 'cookies'

      /**
       * Cookie settings for the first part of the JWT containing `{header}.{payload}`.
       * This is used to store the token metadata and claims.
       *
       * This cookie is not set as HTTP-only to allow JavaScript code to read its value and perform client-side logout operations when needed.
       *
       * @default
       * { name: 'token', secure: 'auto', sameSite: 'strict' }
       */
      headerAndPayload?: Omit<CookieSettings, 'httpOnly'>

      /**
       * Cookie settings for the second part of the JWT containing `{signature}`.
       * This is used to verify the token's authenticity.
       *
       * This cookie should always be HTTP-only.
       *
       * @default
       * { name: 'signature', httpOnly: true, secure: 'auto', sameSite: 'strict' }
       */
      signature?: CookieSettings
    }
  | {
      /**
       * Store token in `localStorage` and send via `Authorization` header.
       */
      storage: 'localStorage'

      /**
       * Key to use in `localStorage` for the token.
       *
       * @default 'token'
       */
      key?: string
    }

export interface CookieSettings {
  /**
   * The `{signature}` cookie name.
   * This should match the corresponding `signature` name used in `auth.tokenResolution`.
   *
   * @default 'signature'
   */
  name?: string

  /**
   * Controls if the cookie is accessible via JavaScript.
   *
   * - When set to `true`, the cookie is only accessible through HTTP(S) requests.
   * - When set to `false`, client-side scripts can also access the cookie.
   *
   * @default true
   */
  httpOnly?: boolean

  /**
   * Controls whether the cookie should be sent only over HTTPS.
   *
   * - When set to `true`, the cookie is sent only over secure HTTPS connections.
   * - When set to `false`, the cookie is sent over both HTTP and HTTPS connections.
   * - When set to `'auto'`, the cookie is sent over HTTPS in production mode, and over HTTP in development mode.
   *
   * @default 'auto'
   */
  secure?: boolean | 'auto'

  /**
   * Specifies the boolean or string to be the value for the `SameSite` `Set-Cookie` attribute.
   *
   * - `true` will set the `SameSite` attribute to `Strict` for strict same site enforcement.
   * - `false` will not set the `SameSite` attribute.
   * - `'lax'` will set the `SameSite` attribute to `Lax` for lax same site enforcement.
   * - `'strict'` will set the `SameSite` attribute to `Strict` for strict same site enforcement.
   * - `'none'` will set the `SameSite` attribute to `None` for an explicit cross-site cookie.
   *
   * More information about the different enforcement levels can be found in the [specification](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-03#section-4.1.2.7).
   *
   * Note: This is an attribute that has not yet been fully standardized, and may change in the future.
   * This also means many clients may ignore this attribute until they understand it.
   *
   * @default 'strict'
   */
  sameSite?: true | false | 'lax' | 'strict' | 'none'
}

export interface ResolvedDebugConfig {
  verbose: boolean
  logs: {
    enabled: boolean
    driver: `sqlite://${string}` | `postgres://${string}` | `d1://${string}`
    api: {
      enabled: boolean
      include: string[]
      exclude: string[]
      exposeRequestData: boolean
      exposeResponseData: boolean
    }
    queries: {
      enabled: boolean
      include: string[]
      exclude: string[]
    }
    queue: boolean
    custom: boolean
  }
}

export interface ResolvedI18nConfig {
  languages: {
    name: string
    code: string
  }[]
  primaryLanguage: string
  prefixPrimaryLanguage: boolean
  fallbackLanguages: string[]
  preloadTranslatableStrings: Record<string, { include: string[]; exclude: string[] }>
}

declare module 'nuxt/schema' {
  interface RuntimeConfig {
    pruvious: Pick<
      DeepRequired<PruviousModuleOptions>,
      'database' | 'api' | 'uploads' | 'cache' | 'queue' | 'dashboard' | 'dir'
    > & {
      auth: Pick<DeepRequired<PruviousModuleOptions['auth']>, 'jwt' | 'hash'> & {
        tokenResolution: DeepRequired<ServerTokenSource>[]
        tokenStorage: DeepRequired<ClientTokenStorage>
      }
      i18n: ResolvedI18nConfig
      debug: ResolvedDebugConfig
    }
  }

  interface PublicRuntimeConfig {
    pruvious: {
      /**
       * The base URL path prefix for all Pruvious API endpoints.
       * By default, routes are placed directly under `/api/`.
       *
       * This setting is derived from the Nuxt config `pruvious.api.basePath`.
       */
      apiBasePath: string

      /**
       * The primary language used by the CMS.
       *
       * This setting is derived from the Nuxt config `pruvious.i18n.primaryLanguage`.
       */
      primaryLanguage: string

      /**
       * Client-side token storage configuration.
       * Defines how authentication tokens are stored and sent by the client.
       *
       * This setting is derived from the Nuxt config `pruvious.auth.tokenStorage`.
       */
      tokenStorage: DeepRequired<ClientTokenStorage>

      /**
       * Controls the preloading of translatable strings by domain in the client.
       *
       * This setting is derived from the Nuxt config `pruvious.i18n.preloadTranslatableStrings`.
       */
      translatableStringsPreloadRules: Record<string, { include: string[]; exclude: string[] }>
    }
  }
}
