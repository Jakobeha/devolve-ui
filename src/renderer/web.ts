import { VNode } from 'core/vdom/node'
import { CoreRenderOptions } from 'core/renderer'
import { CoreAssetCacher, RendererImpl } from 'renderer/common'
import { Key, Strings } from '@raycenity/misc-ts'
import type { Application, Container, DisplayObject, IApplicationOptions, ITextStyle, Sprite, Texture } from 'pixi.js'
import AnsiParser from 'node-ansiparser'

declare global {
  const PIXI: typeof import('pixi.js')
}

interface VRender {
  pixi: DisplayObject | null
  width: number
  height: number
}

export interface BrowserRenderOptions extends CoreRenderOptions, IApplicationOptions {
  container?: HTMLElement
  em?: number
}

class AssetCacher extends CoreAssetCacher {
  getImage (path: string): Texture {
    return this.get(path, PIXI.Texture.from)
  }
}

export class BrowserRendererImpl extends RendererImpl<VRender, AssetCacher> {
  static readonly EM: number = 24

  private readonly canvas: Application

  private readonly em: number

  constructor (root: () => VNode, opts: BrowserRenderOptions = {}) {
    super(new AssetCacher(), opts)

    const container = opts.container ?? document.body
    this.canvas = new PIXI.Application({
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: 0xffffff,
      antialias: true,
      resolution: 1,
      ...opts
    })
    this.em = opts.em ?? BrowserRendererImpl.EM
    container.appendChild(this.canvas.view)

    this.finishInit(root)
  }

  protected override clear (): void {
    this.canvas.stage.removeChildren()
  }

  protected override writeRender (render: VRender): void {
    if (render.pixi !== null) {
      this.canvas.stage.addChild(render.pixi)
    }
  }

  protected override renderNodeImpl (node: VNode): VRender {
    if (VNode.isText(node)) {
      return this.renderText(node.text)
    } else if (VNode.isBox(node)) {
      const {
        visible,
        direction,
        gap,
        width,
        height,
        marginLeft,
        marginTop,
        marginRight,
        marginBottom,
        paddingLeft,
        paddingTop,
        paddingRight,
        paddingBottom
      } = node.box
      if (visible === false) {
        return {
          pixi: null,
          width: 0,
          height: 0
        }
      }

      // Render children
      const children = this.renderDivChildren(node.children, direction, gap)
      const pixi = children.pixi

      // Add padding
      if (paddingLeft !== undefined) {
        pixi.x += paddingLeft
      }
      if (paddingTop !== undefined) {
        pixi.y += paddingTop
      }

      // Clip to get correct size
      if (width !== undefined) {
        const childWidth = width - (paddingLeft ?? 0) - (paddingRight ?? 0)
        if (children.width > childWidth) {
          pixi.width = childWidth
        }
      }
      if (height !== undefined) {
        const childHeight = height - (paddingTop ?? 0) - (paddingBottom ?? 0)
        if (children.height > childHeight) {
          pixi.height = childHeight
        }
      }

      // Add margin
      if (marginLeft !== undefined) {
        pixi.x += marginLeft
      }
      if (marginTop !== undefined) {
        pixi.y += marginTop
      }

      return {
        pixi,
        width: (width ?? (children.width + (paddingLeft ?? 0) + (paddingRight ?? 0))) + (marginLeft ?? 0) + (marginRight ?? 0),
        height: (height ?? (children.height + (paddingTop ?? 0) + (paddingBottom ?? 0))) + (marginTop ?? 0) + (marginBottom ?? 0)
      }
    } else if (VNode.isGraphic(node)) {
      const {
        visible,
        width,
        height
      } = node.image
      if (visible === false) {
        return {
          pixi: null,
          width: 0,
          height: 0
        }
      }
      const image = this.renderImage(node.path)

      if (width !== undefined) {
        image.width = width
      }
      if (height !== undefined) {
        image.height = height
      }

      return {
        pixi: image,
        width: width ?? image.width,
        height: height ?? image.height
      }
    } else {
      throw new Error('Unhandled node type')
    }
  }

  private renderText (text: string): VRender {
    const lines = text.split('\n')
    const width = lines.reduce((max, line) => Math.max(max, Strings.width(line)), 0) * (this.em / 2)
    // TODO: Process terminal escapes
    const pixi = styledPixiText(text, this.em)
    return {
      pixi,
      width,
      height: lines.length * this.em
    }
  }

  private renderDivChildren (children: VNode[], renderDirection?: 'horizontal' | 'vertical' | null, gap?: number): VRender & { pixi: Container } {
    const container = new PIXI.Container()
    let width = 0
    let height = 0
    if (renderDirection === 'vertical') {
      let isFirst = true
      for (const child of children) {
        if (gap !== undefined && !isFirst) {
          height += gap * this.em
        }
        isFirst = false
        const render = this.renderNodeImpl(child)
        if (render.pixi !== null) {
          render.pixi.y = height
          container.addChild(render.pixi)
        }
        width = Math.max(width, render.width)
        height += render.height
      }
    } else if (renderDirection === 'horizontal') {
      let isFirst = true
      for (const child of children) {
        if (gap !== undefined && !isFirst) {
          width += gap * (this.em / 2)
        }
        isFirst = false
        const render = this.renderNodeImpl(child)
        if (render.pixi !== null) {
          render.pixi.x = width
          container.addChild(render.pixi)
        }
        width += render.width
        height = Math.max(height, render.height)
      }
    } else {
      if (gap !== undefined) {
        throw new Error('Gap is not supported for overlay (default) direction')
      }

      for (const child of children) {
        const render = this.renderNodeImpl(child)
        if (render.pixi !== null) {
          container.addChild(render.pixi)
        }
        width = Math.max(width, render.width)
        height = Math.max(height, render.height)
      }
    }
    return {
      pixi: container,
      width,
      height
    }
  }

  private renderImage (path: string): Sprite {
    const image = new PIXI.Sprite(this.assets.getImage(path))
    // noinspection JSDeprecatedSymbols IntelliJ bug
    image.anchor.set(0, 0)
    return image
  }

  override useInput (handler: (key: Key) => void): () => void {
    function listener (key: KeyboardEvent): void {
      handler(Key.fromKeyboardEvent(key))
    }
    document.body.addEventListener('keypress', listener)
    return () => {
      document.body.removeEventListener('keypress', listener)
    }
  }

  override start (fps?: number): void {
    super.start(fps)
    this.canvas.start()
  }

  override stop (): void {
    super.stop()
    this.canvas.stop()
  }

  override dispose (): void {
    super.dispose()
    this.canvas.destroy()
  }
}

function styledPixiText (text: string, fontSize: number): Container {
  const result = new PIXI.Container()
  let row = 0
  let column = 0

  const style: Partial<ITextStyle> = {
    fontFamily: 'monospace',
    fontSize,
    align: 'left',
    wordWrap: false,
    fill: 0x000000
  }
  let underline: boolean = false
  let bgColor: number | null = null
  const ansiTerminalData: AnsiTerminalData = { attr: 0, gb: 0 }

  const addText = (str: string): void => {
    const text = new PIXI.Text(str, style)
    text.x = column * (fontSize / 2)
    text.y = row * fontSize
    result.addChild(text)

    if (bgColor !== null) {
      const bg = new PIXI.Graphics()
      bg.beginFill(bgColor)
      bg.drawRect(0, 0, text.width, text.height)
      bg.endFill()
      bg.x = text.x
      bg.y = text.y
      result.addChild(bg)
    }

    if (underline) {
      const underline = new PIXI.Graphics()
      underline.lineStyle(1, bgColor === null ? 0x000000 : bgColor)
      underline.moveTo(0, text.height)
      underline.lineTo(text.width, text.height)
      underline.x = text.x
      underline.y = text.y
      result.addChild(underline)
    }

    const numLines = Strings.countLines(str)
    if (numLines === 1) {
      column += str.length
    } else {
      row += numLines - 1
      column = str.length - str.lastIndexOf('\n')
    }
  }

  // TODO
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const ansiParser = new AnsiParser({
    inst_p: (str: string): void => {
      addText(str)
    },
    inst_o: (str: string): void => {
      // None supported
    },
    inst_x: (flag: string): void => {
      switch (flag) {
        case '\n':
        case '\x0b':
        case '\x0c':
          row++
          column = 0
          break
        case '\r':
          column = 0
          break
        case '\t':
          column += 8 - (column % 8)
          break
        default:
          // Not supported
          break
      }
    },
    inst_c: (collected: string, params: string[], flag: string): void => {
      switch (flag) {
        case 'A':
          row -= parseInt(params[0], 10)
          break
        case 'B':
          row += parseInt(params[0], 10)
          break
        case 'C':
          column += parseInt(params[0], 10)
          break
        case 'D':
          column -= parseInt(params[0], 10)
          break
        case 'E':
          row += parseInt(params[0], 10)
          column = 0
          break
        case 'F':
          row -= parseInt(params[0], 10)
          column = 0
          break
        case 'G':
          column = parseInt(params[0], 10) - 1
          break
        case 'H':
          row = parseInt(params[0], 10) - 1
          column = parseInt(params[1], 10) - 1
          break
        case 'm': {
          // SGR
          const ansiTerminalStyle = parseSGR(params, ansiTerminalData)
          Object.assign(style, {
            fontWeight: ansiTerminalStyle.bold ? 'bold' : 'normal',
            fontStyle: ansiTerminalStyle.italic ? 'italic' : 'normal',
            fill: ansiTerminalStyle.foreground.set ? [ansiTerminalStyle.foreground.color[0], ansiTerminalStyle.foreground.color[1], ansiTerminalStyle.foreground.color[2]] : 0x000000
          })
          bgColor = ansiTerminalStyle.background.set ? ((ansiTerminalStyle.background.color[0] << 16) | (ansiTerminalStyle.background.color[1] << 8) | (ansiTerminalStyle.background.color[2] << 0)) : null
          underline = ansiTerminalStyle.underline
          break
        }
        default:
          // Not supported
          break
      }
    },
    inst_e: (collected: string, flag: string): void => {

    },
    inst_H: (collected: string, params: string[], flag: string): void => {

    },
    inst_P: (dcs: string): void => {

    },
    inst_U: (): void => {

    }
  })

  return result
}

interface AnsiTerminalData {
  attr: number
  gb: number
}

interface AnsiTerminalColor {
  set: boolean
  RGB: boolean
  color: [number, number, number]
}

interface AnsiTerminalStyle {
  bold: boolean
  italic: boolean
  underline: boolean
  blink: boolean
  inverse: boolean
  conceal: boolean
  foreground: AnsiTerminalColor
  background: AnsiTerminalColor
}

// Copied from https://github.com/netzkolchose/node-ansiterminal/blob/master/dist/ansiterminal.js
function parseSGR (params: string[], ansiTerminalData: AnsiTerminalData = { attr: 0, gb: 0 }): AnsiTerminalStyle {
  let extColors = 0
  let RGBmode = false
  let counter = 0
  let { attr, gb } = ansiTerminalData

  for (let i = 0; i < params.length; ++i) {
    const param = parseInt(params[i], 10)
    // special treatment for extended colors
    if (extColors !== 0) {
      // first run in extColors gives color mode
      // sets counter to determine max consumed params
      if (counter === 0) {
        switch (param) {
          case 2:
            RGBmode = true
            counter = 3 // eval up to 3 params
            // fg set SET+RGB: |(1<<26)|(1<<27)
            // bg set SET+RGB: |(1<<24)|(1<<25)
            attr |= (extColors === 38) ? 201326592 : 50331648
            break
          case 5:
            RGBmode = false
            counter = 1 // eval only 1 param
            // fg clear RGB, set SET: &~(1<<27)|(1<<26)
            // bg clear RGB, set SET: &~(1<<25)|(1<<24)
            attr = (extColors === 38)
              ? (attr & ~134217728) | 67108864
              : (attr & ~33554432) | 16777216
            break
          default:
            // unkown mode identifier, breaks ext_color mode
            console.log('sgr unknown extended color mode:', extColors)
            extColors = 0
        }
        continue
      }
      if (RGBmode) {
        switch (counter) {
          case 3:
            // red
            attr = (extColors === 38)
              ? (attr & ~65280) | (param << 8)
              : (attr & ~255) | param
            break
          case 2:
            // green
            gb = (extColors === 38)
              ? (gb & ~4278190080) | (param << 24)
              : (gb & ~16711680) | (param << 16)
            break
          case 1:
            // blue
            gb = (extColors === 38)
              ? (gb & ~65280) | (param << 8)
              : (gb & ~255) | param
        }
      } else {
        // 256 color mode
        // uses only lower bytes of attribute
        attr = (attr === 38)
          ? (attr & ~65280) | (param << 8)
          : (attr & ~255) | param
      }
      counter -= 1
      if (counter === 0) { extColors = 0 }
      continue
    }
    switch (param) {
      case 0:
        attr = 0
        break
      case 1:
        attr |= 65536
        break // bold on
      case 2:
        break // not supported (faint)
      case 3:
        attr |= 131072
        break // italic on
      case 4:
        attr |= 262144
        break // underline on
      case 5:
        attr |= 524288
        break // blink on
      case 6:
        attr |= 524288
        break // only one blinking speed
      case 7:
        attr |= 1048576
        break // inverted on
      case 8:
        attr |= 2097152
        break // conceal on
      case 9:
        break // not supported (crossed out)
      case 10: // not supported (font selection)
      case 11:
      case 12:
      case 13:
      case 14:
      case 15:
      case 16:
      case 17:
      case 18:
      case 19:
        break
      case 20:
        break // not supported (fraktur)
      case 21:
        break // not supported (bold: off or underline: double)
      case 22:
        attr &= ~65536
        break // bold off
      case 23:
        attr &= ~131072
        break // italic off
      case 24:
        attr &= ~262144
        break // underline off
      case 25:
        attr &= ~524288
        break // blink off
      case 26:
        break // reserved
      case 27:
        attr &= ~1048576
        break // inverted off
      case 28:
        attr &= ~2097152
        break // conceal off
      case 29:
        break // not supported (not crossed out)
      case 30:
      case 31:
      case 32:
      case 33:
      case 34:
      case 35:
      case 36:
      case 37:
        // clear fg RGB, nullify fg, set fg SET, color
        // -134283009 = ~(1<<27) & ~(255<<8)
        attr = (attr & -134283009) | 67108864 | (param % 10 << 8)
        break
      case 38:
        extColors = 38
        break
      case 39: // default foreground color
        attr &= ~67108864 // fg set to false (1<<26)
        break
      case 40:
      case 41:
      case 42:
      case 43:
      case 44:
      case 45:
      case 46:
      case 47:
        // clear bg RGB, nullify bg, set bg SET, color
        // -33554688 = ~(1<<25) & ~255
        attr = (attr & -33554688) | 16777216 | param % 10
        break
      case 48:
        extColors = 48
        break
      case 49: // default background color
        attr &= ~16777216 // bg set to false
        break
      case 90:
      case 91:
      case 92:
      case 93:
      case 94:
      case 95:
      case 96:
      case 97:
        // same as 37 but with |8 in color
        attr = (attr & -134283009) | 67108864 | (param % 10 | 8 << 8)
        break
      case 100:
      case 101:
      case 102:
      case 103:
      case 104:
      case 105:
      case 106:
      case 107:
        // same as 47 but with |8 in color
        attr = (attr & -33554688) | 16777216 | param % 10 | 8
        break
      default:
        console.log('sgr unknown:', params[i])
    }
  }

  ansiTerminalData.attr = attr
  ansiTerminalData.gb = gb

  const colorbits = attr >>> 24
  const r = attr & 65535
  const g = gb >>> 16
  const b = gb & 65535
  const bits = attr >>> 16 & 255
  return {
    bold: (bits & 1) !== 0,
    italic: (bits & 2) !== 0,
    underline: (bits & 4) !== 0,
    blink: (bits & 8) !== 0,
    inverse: (bits & 16) !== 0,
    conceal: (bits & 32) !== 0,
    // cursor: (bits & 64) !== 0,
    foreground: {
      set: (colorbits & 4) !== 0,
      RGB: (colorbits & 8) !== 0,
      color: [r >>> 8, g >>> 8, b >>> 8]
    },
    background: {
      set: (colorbits & 1) !== 0,
      RGB: (colorbits & 2) !== 0,
      color: [r & 255, g & 255, b & 255]
    }
  }
}
