import { debounce } from 'ts-debounce'

/**
 * Create a new function that, when called, has its `this` keyword set to the
 * provided value, with a given sequence of arguments preceding any provided
 * when the new function is called.
 */
export function Bind<T extends (...args: any[]) => any>(
  _target: object,
  propertyKey: string,
  descriptor: TypedPropertyDescriptor<T>,
): TypedPropertyDescriptor<T> | void {
  return {
    configurable: true,
    get(this: T): T {
      const bound: T = descriptor!.value!.bind(this) as T

      Object.defineProperty(this, propertyKey, {
        value: bound,
        configurable: true,
        writable: true,
      })

      return bound
    },
  }
}

/**
 * Create and return a new debounced version of the passed function that will
 * postpone its execution until after wait `milliseconds` have elapsed since
 * the last time it was invoked.
 *
 * Note that this decorator will prevent execution on class level, i.e multiple
 * instances of the class are sharing the debounce pool. Use `debounceParallel`
 * to provide separated debounce pools for functions.
 */
export function Debounce(milliseconds: number) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const map = new WeakMap()
    const originalMethod = descriptor.value

    descriptor.value = function (...params: any[]) {
      let debounced = map.get(this)

      if (!debounced) {
        debounced = debounce(originalMethod, milliseconds).bind(this)
        map.set(this, debounced)
      }

      debounced(...params)
    }

    return descriptor
  }
}
