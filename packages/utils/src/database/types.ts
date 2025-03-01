/**
 * Characters that can be used after a SQL parameter.
 */
export type CharacterAfterSQLParam =
  | ' '
  | ','
  | ';'
  | '('
  | ')'
  | '='
  | '!'
  | '>'
  | '<'
  | '['
  | ']'
  | '|'
  | '"'
  | '+'
  | '-'
  | '*'
  | '/'
  | '%'
  | '_'

/**
 * Extracts parameters starting with a dollar sign ($) from a SQL string.
 *
 * @example
 * ```ts
 * type T0 = ExtractSQLParams<'select * from "foo" where "id" = $id'> // { id: any }
 * ```
 */
export type ExtractSQLParams<
  T extends string,
  P extends Record<string, any> = {},
> = T extends `${infer _}$${infer Param}${CharacterAfterSQLParam}${infer R}`
  ? ExtractSQLParams<R, P & (Param extends `${infer _}${CharacterAfterSQLParam}` ? {} : { [K in Param]: any })>
  : P & (T extends `${infer _}$${infer LastParam}` ? { [K in LastParam]: any } : {})

/**
 * Checks if an SQL string is a SELECT query.
 *
 * @example
 * ```ts
 * type T0 = IsSelectQuery<'select * from "foo"'> // true
 * type T1 = IsSelectQuery<'insert into "foo"'>   // false
 * ```
 */
export type IsSelectQuery<T extends string> = Lowercase<T> extends `select ${string}` ? true : false

/**
 * Checks if an SQL string is an INSERT query.
 *
 * @example
 * ```ts
 * type T0 = IsInsertQuery<'insert into "foo"'>   // true
 * type T1 = IsInsertQuery<'select * from "foo"'> // false
 * ```
 */
export type IsInsertQuery<T extends string> = Lowercase<T> extends `insert ${string}` ? true : false

/**
 * Checks if an SQL string is an UPDATE query.
 *
 * @example
 * ```ts
 * type T0 = IsUpdateQuery<'update "foo"'>        // true
 * type T1 = IsUpdateQuery<'select * from "foo"'> // false
 * ```
 */
export type IsUpdateQuery<T extends string> = Lowercase<T> extends `update ${string}` ? true : false

/**
 * Checks if an SQL string is a DELETE query.
 *
 * @example
 * ```ts
 * type T0 = IsDeleteQuery<'delete from "foo"'>   // true
 * type T1 = IsDeleteQuery<'select * from "foo"'> // false
 * ```
 */
export type IsDeleteQuery<T extends string> = Lowercase<T> extends `delete ${string}` ? true : false

/**
 * Checks if an SQL string has a RETURNING clause.
 *
 * @example
 * ```ts
 * type T0 = HasReturningClause<'select * from "foo" returning "id"'> // true
 * type T1 = HasReturningClause<'select * from "foo"'>                // false
 * ```
 */
export type HasReturningClause<T extends string> = Lowercase<T> extends `${string} returning ${string}` ? true : false
