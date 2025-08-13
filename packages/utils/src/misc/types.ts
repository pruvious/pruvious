/**
 * Recursively makes all properties and nested properties of a type required.
 */
export type DeepRequired<T> =
  T extends Array<infer U>
    ? Array<DeepRequired<U>>
    : T extends object
      ? { [K in keyof T]-?: DeepRequired<NonNullable<T[K]>> }
      : T

/**
 * Recursively makes all properties and nested properties of a type optional.
 */
export type DeepPartial<T> = T extends Function ? T : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T

/**
 * Makes properties optional only at the first level of an object type.
 * Nested objects remain unchanged.
 */
type PartialLevel1<T> = {
  [P in keyof T]?: Partial<T[P]>
}

/**
 * Makes properties optional up to maximum 2 levels of nesting while preserving function types.
 */
export type PartialMax2Levels<T> = {
  [P in keyof T]?: T[P] extends object ? (T[P] extends Function ? T[P] : PartialLevel1<T[P]>) : T[P]
}

/**
 * Makes properties optional up to maximum 3 levels of nesting while preserving function types.
 */
export type PartialMax3Levels<T> = {
  [P in keyof T]?: T[P] extends object ? (T[P] extends Function ? T[P] : PartialMax2Levels<T[P]>) : T[P]
}

/**
 * Makes properties optional up to maximum 4 levels of nesting while preserving function types.
 */
export type PartialMax4Levels<T> = {
  [P in keyof T]?: T[P] extends object ? (T[P] extends Function ? T[P] : PartialMax3Levels<T[P]>) : T[P]
}

/**
 * Infers the return type of a function or the type of a value.
 *
 * @example
 * ```ts
 * type T0 = InferResult<() => string> // string
 * type T1 = InferResult<number>       // number
 * ```
 */
export type InferResult<T> = T extends (...args: any[]) => infer R ? R : T

/**
 * Types that can be deeply compared for equality against their copies.
 * These are fundamental data types that don't contain nested structures.
 */
export type Primitive = boolean | null | number | string | undefined

/**
 * Converts a string type to its primitive counterpart.
 */
export type OptionToPrimitive<T extends string> = T extends 'boolean'
  ? boolean
  : T extends 'null'
    ? null
    : T extends 'number'
      ? number
      : T extends 'string'
        ? string
        : T extends 'undefined'
          ? undefined
          : never

/**
 * Types that can be serialized to JSON.
 */
export type Serializable = Primitive | Primitive[] | { [key: string]: Serializable }

/**
 * Represents values that can be interpreted as boolean.
 * Includes actual booleans, numbers, and strings commonly used to represent true/false states.
 */
export type Booleanish = boolean | 1 | '1' | 'true' | 't' | 'yes' | 'y' | 0 | '0' | 'false' | 'f' | 'no' | 'n'

/**
 * Extracts the keys of an object type that are strings.
 */
export type StringKeys<T> = { [K in keyof T]: T[K] extends string ? K : never }[keyof T]

/**
 * Represents a non-empty array of elements of type `T`.
 */
export type NonEmptyArray<T> = T[] & [T, ...T[]]

/**
 * Makes specified keys in a type optional while keeping the rest of the keys as they are.
 */
export type Optional<T extends Record<string, any>, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * Sets the default value to `true` if `T` is not explicitly `false`.
 */
export type DefaultTrue<T> = [T] extends [false] ? false : true

/**
 * Sets the default value to `false` if `T` is not explicitly `true`.
 */
export type DefaultFalse<T> = [T] extends [true] ? true : false

/**
 * Sets the default value to `false` if `T` is not explicitly `true` or an object.
 */
export type DefaultFalseWithOptions<T> = [T] extends [true] ? true : [T] extends [object] ? true : false

/**
 * Sets the default value to `T` if `D` is `undefined`.
 * Otherwise, sets the default value to `T`.
 */
export type WithDefault<T, D> = [T] extends [undefined] ? D : T

/**
 * Extracts the values of an array of objects with a `value` property.
 */
export type ExtractValues<T> = T extends Array<{ value: infer V }> ? V : never

/**
 * Removes all properties from an object type that have a `never` type.
 */
export type OmitNever<T> = {
  [K in keyof T as T[K] extends never ? never : K]: T[K]
}

/**
 * Removes all properties from an object type that have an `undefined` type.
 */
export type OmitUndefined<T> = {
  [K in keyof T as T[K] extends undefined ? never : K]: T[K]
}

/**
 * Represents a deeply nested structure where values can be either strings or nested objects.
 * Each nested object follows the same pattern recursively.
 */
export interface NestedStringRecord {
  [key: string]: string | Record<string, NestedStringRecord>
}

/**
 * Removes the `readonly` modifier from all properties of a type.
 */
export type Writable<T> = {
  -readonly [K in keyof T]: T[K]
}
