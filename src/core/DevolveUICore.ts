import { Renderer, VNode } from 'core/index'
import type { TerminalRenderOptions } from 'renderer/cli'
import type { BrowserRenderOptions } from 'renderer/web'
import { VComponent } from 'core/component'
import { DeepReadonly } from '@raycenity/misc-ts'

export type RenderOptions =
  TerminalRenderOptions &
  BrowserRenderOptions

export abstract class DevolveUICore<Props extends object> {
  protected abstract mkRenderer (root: () => VNode, opts?: RenderOptions): Renderer

  private readonly instance: Renderer
  protected readonly props: Props
  /** A proxy which sets the given property */
  readonly p: Props

  /** Renders a HUD with the given content and doesn't clear, useful for logging */
  protected static _renderSnapshot<Props>(mkRenderer: (root: () => VNode, opts?: RenderOptions) => Renderer, RootComponent: (props: Props) => VNode, props: Props, opts?: RenderOptions): void {
    const renderer = mkRenderer(() => VComponent('RootComponent', props, RootComponent), opts)
    renderer.forceRerender()
    renderer.dispose()
  }

  constructor (private readonly RootComponent: (props: Props) => VNode, props: Props, opts?: RenderOptions) {
    // Idk why the cast is necessary
    this.props = { ...props }
    this.instance = this.mkRenderer(() => VComponent('RootComponent', this.props, RootComponent), opts)
    this.p = this.propsProxy(this.props, true)
  }

  getProps (): DeepReadonly<Props> {
    return this.props
  }

  setProps (newProps: Props): void {
    Object.assign(this.props, newProps)
  }

  show (): void {
    this.instance.show()
  }

  hide (): void {
    this.instance.hide()
  }

  close (): void {
    this.instance.dispose()
  }

  private propsProxy<T extends object>(props: T, isRoot: boolean = false): T {
    return new Proxy(props, {
      get: (target: T, p: string | symbol): any => {
        const value = (target as any)[p]
        if (typeof value === 'object') {
          return this.propsProxy(value)
        } else if (typeof value === 'function') {
          // Answer to https://stackoverflow.com/questions/43236329/why-is-proxy-to-a-map-object-in-es2015-not-working?noredirect=1&lq=1
          return this.propsProxy(value.bind(target))
        } else {
          return value
        }
      },
      set: (target: T, p: string | symbol, value: any): boolean => {
        if (isRoot && (p === 'prompts')) {
          throw new Error('can\'t set prompts')
        }
        (target as any)[p] = value
        this.updateProps()
        return true
      },
      apply: (target: T, thisArg: any, args: any[]): any => {
        // Function might change stuff, so we reroot (e.g. in arrays)
        // Worst case scenario we just reroot when not necessary
        this.updateProps()
        return Reflect.apply(target as Function, thisArg, args)
      }
    })
  }

  protected updateProps (): void {
    // reroot only rerenders once per frame, so batch update functionality isn't needed
    this.instance.reroot(this.props)
  }
}
