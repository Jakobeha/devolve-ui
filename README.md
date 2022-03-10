[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

# devolve-ui: super simple reactive graphics for browser *and* terminal

*Keep in mind this is an early project, so it's subject to change or be buggy*

**Live demos @ [https://github.com/Jakobeha/devolve-ui-demos/src/index.html](https://github.com/Jakobeha/devolve-ui-demos/src/index.html). Clone to get started: [https://github.com/Jakobeha/devolve-ui-demos](https://github.com/Jakobeha/devolve-ui-demos)**

devolve-ui is a super simple graphics library for canvas-based websites (games) *and* TUIs. A single devolve-ui app can be embedded in a website *and* run on the command line via `node`.

devolve-ui is JSX-based, like React, but simpler, with fewer dependencies and size. It also allows you to manipulate the props directly, and has built-in support for the [*prompt-based GUI*](./docs/prompt-based-gui.md) pattern, where you wrap user interactions into asynchronous function calls (although this pattern can also be implemented in React or any other library).

**Important setup information:** if adding to an existing project, besides installing the, you *must* add this to your tsconfig.json or TypeScript won't work with the project:

```json5
{
  /* ... */
  "jsx": "preserve", /** if using esbuild, otherwise "react" */
  "jsxImportSource": "@raycenity/devolve-ui"
}
```

```bash
# if you don't have pnpm installed, uncomment the next line
# curl -fsSL https://get.pnpm.io/install.sh | sh -
pnpm add @raycenity/devolve-ui
```

Example:

```tsx
// https://github.com/Jakobeha/devolve-ui-demos/src/readme.tsx
import { DevolveUI, useState, useInterval } from '@raycenity/devolve-ui'

interface AppProps {
  name: string
}

const App = ({ name }: AppProps) => {
  const [counter, setCounter] = useState(0)
  useInterval(1000, () => {
    setCounter(counter + 1)
  })

  return (
    <zbox width='100%'>
      <vbox x={2} y={2} gap={1}>
        <zbox width='100%'>
          <hbox width='100%'>
            <text color='white'>Hello {name}</text>
            <text color='white' x='100%' anchorX={1}>{counter} seconds</text>
          </hbox>
          <color color='orange' />
        </zbox>
        <source src='dog.png' width='100%' />
      </vbox>
      <border style='single' color='orange' width='prev + 4' height='prev + 4'/>
    </zbox>
  )
}

new DevolveUI(App, { name: 'devolve-ui' }).show()

// Works in node or browser (with additional pixi.js script)
```

## Cross-platform

devolve-ui is *cross-platform* (isomorphic): a devolve-ui application may run in both web browsers and terminals (via node.js). When the application is run in the terminal, graphics are much simpler and certain effects and animations are removed, hence the name "devolve"-ui.

When a devolve-ui application is run in the web browser, it uses pixi.js for rendering.

## Super simple

devolve-ui uses JSX and React-style **components**: you write your UI declaratively and use hooks (useState, useEffect, useLazy, useInput) for local state and side-effects. Your UI is literally a function which takes the global state, and returns a render your application.

devolve-ui components return **nodes**, which make up the "virtual DOM" or "HTML" of your scene. Unlike real HTML there are 3 kinds of nodes: box, text, and graphic. Boxes contain children and define your layout, text contains styled (e.g. bold, colored) text, and graphics are solid backgrounds, gradients, images, videos, and custom pixi elements.

Every devolve-ui node has **bounds**, which define its position, size, and z-position (nodes with higher z-positions are rendered on top of nodes with lower z-positions). You create bounds using the function `Bounds`, e.g. `Bounds({ left: '32em', centerY: '50%', width: '250px' })`. The bounds system is very flexibld, so you can define custom layouts (see the section in [Implementation](#Bounds)).

## Prompt-based GUI

Prompt-based GUI is when you write your GUI components as asynchronous functions which display prompts, and then await the user's input before they continue execution. You can present prompts concurrently using `Promise.all` or `Promise.race`, and thus you can write entire GUI applications in this pattern. Prompt-based GUI is particularly useful if you want your application to be easily automated, or if your application's UI is stateful (as opposed to a control center where the GUI elements don't change much).

In devolve-ui, you call `devolveUI.prompt(name, input)` with your prompt name and input. This function re-renders your UI with the `prompt.name` prop set to `input`. Your root UI component uses this prop to display the prompt. When the prompt is completed, your UI calls `prompt.name.resolve` (or `prompt.name.reject`) with the prompt output, and the `devolveUI.prompt` call returns with this value.

For more info, read [*the article*](./docs/prompt-based-gui.md)

### Implementation

devolve-ui has minimal dependencies and is lightweight relative to React. It is open source so you can [read the code yourself](https://github.com/Jakobeha/devolve-ui/tree/master/src)

#### Rendering

A component is essentially a function which takes the component's props and children and returns a node.

When the scene re-renders, devolve-ui calls each component function to reconstruct the nodes, reusing child components by matching them via their keys and function names, and preserving each component's state through hooks (which  are bound to the component).

Next, devolve-ui calculates each node's absolute bounding box by calling its `bounds`, using the parent node or scene's bounding box and sublayout. devolve-ui uses the position and x-position to determine the order it renders the nodes, and uses the size to affect how the node itself renders (wrapping text, scaling graphics).

Finally, devolve-ui draws each node onto the scene: in Terminal devolve-ui clears the display buffer and prints each node, in pixi.js it removes all DisplayObjects from the scene and re-adds them.

#### Bounds

Internally, every `bounds` value is actually by a function which takes the parent node's bounding
box and sublayout, and returns the node's absolute bounding box. This means that nodes can have absolute positions or z-positions regardless of their parents,  offsets and sizes which are percentages of the parents' size, margins, padding, gaps, and even completely custom layouts. In practice, you always create bounds using the `Bounds` function.

## Installing

devolve-ui can be installed using [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/).

```shell
pnpm install @raycenity/devolve-ui
```

Alternatively you can just download the built code directly [here](https://github.com/Jakobeha/devolve-ui/releases/latest). The code is an unminified ES module (learn about ES modules [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules))

## Repository info (e.g. for contributing)

devolve-ui is built using [esbuild](https://esbuild.org/). The package manager used is [pnpm](https://pnpm.io/). Linting is done by [standard](https://standardjs.com/), however we use a *slightly* modified version removing some warnings which is run through `pnpm run lint` (specifically `node ts-standardx.mjs`).
