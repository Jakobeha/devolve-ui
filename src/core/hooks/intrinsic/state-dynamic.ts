import { getVComponent, isDebugMode, VComponent } from 'core/component'
import { augmentSetProp } from 'core/augment-set'

/**
 * Returns a value accessible by a proxy.
 *
 * If you mutate the value, it will stay mutated when the component updates.
 */
export function useState<T> (initialState: T): { v: T } {
  const component = getVComponent()
  const index = component.nextStateIndex++
  if (component.isBeingCreated) {
    if (component.state.length !== index) {
      throw new Error(`sanity check failed: state length (${component.state.length}) !== index (${index})`)
    }
    component.state.push({ v: initialState })
  }

  const value = component.state[index]
  return augmentSetProp(value, debugPath => {
    const stackTrace = isDebugMode()
      ? (new Error().stack?.replace('\n', '  \n') ?? 'could not get stack, new Error().stack is undefined')
      : 'omitted in production'
    VComponent.update(component, `set-state-${index}-${debugPath}\n${stackTrace}`)
  })
}

/**
 * Returns a value and setter.
 *
 * If you call the setter, when the component updates, it will return the set value instead of `initialValue`.
 *
 * This is faster than `useState` because it doesn't use proxies.
 * However, it is also more prone to errors because calling the setter doesn't immediately update the value,
 * and mutating the value internally doesn't cause any updates.
 * `useState` avoids the former because you access the value via `.v`, which is updated,
 * and the latter because the proxy handles deep updates.
 */
export function useStateFast<T> (initialState: T): [T, (newState: T) => void] {
  const [get, set] = _useDynamicState(initialState, true)
  return [get(), set]
}

/**
 * Returns a function which will update with the last value passed into it,
 * for use in asynchronous effects.
 *
 * Check out `useDynamicFn` as it can often allow you to avoid this,
 * by making the calling function itself update every time the component updates.
 */
export function useDynamic<T> (value: T): () => T {
  const [get, set] = _useDynamicState(value, false)
  set(value)
  return get
}

export function _useDynamicState<T> (initialState: T, doUpdate: boolean): [() => T, (newState: T) => void] {
  const component = getVComponent()
  const index = component.nextStateIndex++
  if (component.isBeingCreated) {
    if (component.state.length !== index) {
      throw new Error(`sanity check failed: state length (${component.state.length}) !== index (${index})`)
    }
    component.state.push(initialState)
  }

  return [
    () => component.state[index],
    (newState: T) => {
      // Don't trigger update if state is the same
      if (component.state[index] !== newState) {
        component.state[index] = newState
        if (doUpdate) {
          const stackTrace = isDebugMode()
            ? (new Error().stack?.replace('\n', '  \n') ?? 'could not get stack, new Error().stack is undefined')
            : 'omitted in production'
          VComponent.update(component, `set-state-${index}\n${stackTrace}`)
        }
      }
    }
  ]
}
