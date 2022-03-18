import {
  JSXBorderAttrs,
  JSXBoxAttrs,
  JSXColorAttrs,
  JSXSourceAttrs,
  JSXTextAttrs
} from 'core/vdom/attrs'
import { SubLayout } from 'core/vdom/bounds'
import { VBorder, VBox, VColor, VNode, VSource, VText } from 'core/vdom/node'
import { ExplicitPartial, IntoArray } from '@raycenity/misc-ts'
import { jsxToNormalAttrs, jsxColorToNormalAttrs } from 'core/vdom/jsx-helpers'

export type VJSX =
  VNode |
  null |
  undefined |
  VJSX[]

export module VJSX {
  export function collapse (jsx: VJSX): VNode[] {
    if (Array.isArray(jsx)) {
      return jsx.flatMap(collapse)
    } else if (jsx === null || jsx === undefined) {
      return []
    } else {
      return [jsx]
    }
  }
}

export interface JSXIntrinsics {
  hbox: Omit<JSXBoxAttrs, 'direction'> & { children?: VJSX[] }
  vbox: Omit<JSXBoxAttrs, 'direction'> & { children?: VJSX[] }
  zbox: Omit<JSXBoxAttrs, 'direction'> & { children?: VJSX[] }
  box: JSXBoxAttrs & { children?: VJSX[] }
  text: JSXTextAttrs & { children?: string | string[] }
  color: JSXColorAttrs & { children?: [] }
  border: JSXBorderAttrs & { children?: [] }
  source: JSXSourceAttrs & { children?: [] }
}

export interface JSXIntrinsicAttributes {
  key?: string | number
}

export const intrinsics: {
  [Key in keyof JSXIntrinsics]: (props: Omit<JSXIntrinsics[Key], 'children'>, ...children: IntoArray<JSXIntrinsics[Key]['children']>) => VNode
} = {
  hbox: (props: Omit<JSXBoxAttrs, 'direction'>, ...children: VJSX[]): VNode =>
    intrinsics.box({ ...props, direction: 'horizontal' }, ...children),
  vbox: (props: Omit<JSXBoxAttrs, 'direction'>, ...children: VJSX[]): VNode =>
    intrinsics.box({ ...props, direction: 'vertical' }, ...children),
  zbox: (props: Omit<JSXBoxAttrs, 'direction'>, ...children: VJSX[]): VNode =>
    intrinsics.box({ ...props, direction: 'overlap' }, ...children),
  box: (props: JSXBoxAttrs, ...children: VJSX[]): VNode => {
    const { visible, key, bounds, direction, gap, custom, ...attrs } = jsxToNormalAttrs(props)
    const sublayout: ExplicitPartial<SubLayout> = { direction, gap, custom }

    const children_ = VJSX.collapse(children)
    if (children_.length > 1 && direction === undefined) {
      console.warn('direction must be specified for multiple children')
    }

    return VBox(children_, { bounds, visible, key, sublayout, ...attrs })
  },
  text: (props: JSXTextAttrs, ...text: string[]): VNode => VText(text.join(''), jsxColorToNormalAttrs(props, false)),
  color: (props: JSXColorAttrs): VNode => VColor(jsxColorToNormalAttrs(props, true)),
  border: (props: JSXBorderAttrs): VNode => VBorder(jsxColorToNormalAttrs(props, false)),
  source: (props: JSXSourceAttrs): VNode => VSource(jsxToNormalAttrs(props))
}
