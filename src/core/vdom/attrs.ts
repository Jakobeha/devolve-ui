import { Bounds, BoundsSpec, SubLayout } from 'core/vdom/bounds'
import { BorderStyle } from 'core/vdom/border-style'
import { Color, ColorSpec, LCHColor, RGBColor } from 'core/vdom/color'

export interface CommonAttrs {
  bounds?: Bounds
  visible?: boolean
  key?: string
}

export interface BoxAttrs extends CommonAttrs {
  sublayout?: SubLayout
}

export interface TextAttrs extends CommonAttrs {
  color: Color | null
  wrapMode?: 'word' | 'char' | 'clip'
}

export interface ColorAttrs extends CommonAttrs {
  color: Color
}

export interface BorderAttrs extends CommonAttrs {
  color: Color | null
  style: BorderStyle
}

export interface SourceAttrs extends CommonAttrs {
  src: string
}

export type JSXTextAttrs = JSXColorAttrs<TextAttrs>
export type JSXBoxAttrs = Omit<BoxAttrs, 'sublayout'> & SubLayout & BoundsSpec
export type JSXColorAttrs<T extends CommonAttrs & { color: Color | null } = ColorAttrs> = Omit<T, 'color'> & Partial<{ color: ColorSpec } & LCHColor & RGBColor> & BoundsSpec
export type JSXBorderAttrs = JSXColorAttrs<BorderAttrs>
export type JSXSourceAttrs = SourceAttrs & BoundsSpec
