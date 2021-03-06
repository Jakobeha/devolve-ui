import { VView } from 'core/view/view'
import { intrinsics, JSXIntrinsics, VJSX } from 'core/view/jsx'
import { VComponent } from 'core/component'
import { IntoArray } from '@raycenity/misc-ts'
import { VNode } from 'core/view'

function createElement (
  element: undefined,
  props: {},
  ...children: VJSX[]
): VNode[]
function createElement <Key extends keyof JSXIntrinsics> (
  element: Key,
  props: Omit<JSXIntrinsics[Key], 'children'>,
  ...children: IntoArray<JSXIntrinsics[Key]['children']>
): VView
function createElement <T extends VView, Props, Children extends any[]> (
  element: (props: Props & { children?: Children }) => T,
  props: Props & { key?: string },
  ...children: Children
): VComponent & { node: T }
function createElement <T extends VView, Props extends { key?: string }, Children extends any[]> (
  element: undefined | keyof JSXIntrinsics | ((props: Props & { children?: Children }) => T),
  props: Props & { key?: string },
  ...children: Children
): VNode | VNode[] {
  // idk why jsx generates this code
  if (props === null || props === undefined) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    props = {} as Props
  }

  if (element === undefined) {
    // Fragment (<>{children}</>)
    return VJSX.collapse(children as VJSX[])
  } else if (typeof element === 'string') {
    // Intrinsic element
    const intrinsic = intrinsics[element]
    if (intrinsic === undefined) {
      throw new Error(`intrinsic element doesn't exist: ${element}`)
    } else {
      return intrinsic(props as any, ...children)
    }
  } else {
    // Component
    return VComponent(props.key ?? element.name, { ...props, children }, element)
  }
}

export const React = { createElement }
// @ts-expect-error
globalThis.React = React
