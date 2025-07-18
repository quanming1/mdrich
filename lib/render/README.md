# MDAST React 渲染器

一个受 Slate-React 启发的 MDAST（Markdown Abstract Syntax Tree）到 React 组件的渲染库。

## 功能特性

- 🎯 **类型安全**：完整的 TypeScript 支持
- 🔧 **高度可定制**：支持自定义渲染器
- ⚡ **性能优化**：基于 React.memo 的优化渲染
- 🛡️ **安全渲染**：可配置的 HTML 渲染控制
- 🪝 **React Hooks**：现代化的 API 设计
- 🎨 **样式灵活**：支持 className 和 style 属性

## 快速开始

### 基础使用

```tsx
import { renderMDAST, defaultConfig } from 'lib/render'

const mdastTree = {
  type: 'root',
  children: [
    {
      type: 'paragraph',
      children: [
        { type: 'text', value: '这是一个段落' }
      ]
    }
  ]
}

// 直接渲染
const element = renderMDAST(mdastTree, defaultConfig)

// 在组件中使用
function MyComponent() {
  return <div>{element}</div>
}
```

### 使用 Hook

```tsx
import { useMDASTRenderer } from 'lib/render'

function MarkdownViewer({ tree }) {
  const { render } = useMDASTRenderer()

  return (
    <div>
      {render(tree)}
    </div>
  )
}
```

### 自定义渲染器

```tsx
import {
  useMDASTRenderer,
  useRendererConfig,
  HeadingRenderProps
} from 'lib/render'

// 自定义标题渲染器
const CustomHeading = ({ level, children, className, style }: HeadingRenderProps) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements
  return (
    <Tag
      className={`custom-heading ${className || ''}`}
      style={{ color: 'blue', ...style }}
    >
      🔥 {children}
    </Tag>
  )
}

function CustomMarkdownViewer({ tree }) {
  const config = useRendererConfig({
    heading: CustomHeading,
  })

  const { render } = useMDASTRenderer(config)

  return <div>{render(tree)}</div>
}
```

### 使用 MDRenderer 组件

```tsx
import { MDRenderer } from 'lib/render'

function App() {
  return (
    <MDRenderer
      tree={mdastTree}
      className="markdown-content"
      style={{ padding: '20px' }}
    />
  )
}
```

## API 参考

### 核心函数

#### `renderMDAST(tree, config)`

直接渲染 MDAST 树为 React 元素。

- `tree: Root` - MDAST 根节点
- `config?: RendererConfig` - 渲染配置
- 返回：`React.ReactElement`

### Hooks

#### `useMDASTRenderer(config?)`

主要的渲染 Hook。

```tsx
const { render, config, updateConfig } = useMDASTRenderer(initialConfig)
```

#### `useRendererConfig(customRenderers?, options?)`

创建渲染器配置。

```tsx
const config = useRendererConfig({
  paragraph: CustomParagraph,
  heading: CustomHeading,
}, {
  allowDangerousHtml: true,
  className: 'markdown'
})
```

#### `useSafeRenderer()` / `useFullRenderer()`

预配置的安全 / 完整渲染器。

```tsx
const { render } = useSafeRenderer() // HTML被禁用
const { render } = useFullRenderer() // HTML被允许
```

### 组件

#### `<MDRenderer>`

直接渲染组件。

```tsx
<MDRenderer
  tree={mdastTree}
  config={config}
  className="content"
  style={{ margin: '10px' }}
/>
```

### 工具函数

#### 节点类型检查

```tsx
import { isHeading, isText, isParagraph } from 'lib/render'

if (isHeading(node)) {
  console.log('标题级别:', node.depth)
}
```

#### 树操作

```tsx
import { walkTree, findNode, getNodePath } from 'lib/render'

// 遍历所有节点
walkTree(tree, (node, depth) => {
  console.log(`${' '.repeat(depth)}${node.type}`)
})

// 查找特定节点
const firstHeading = findNode(tree, isHeading)

// 获取节点路径
const path = getNodePath(tree, someNode)
```

## 配置选项

### RendererConfig

```tsx
interface RendererConfig {
  renderers?: Renderers           // 自定义渲染器
  className?: string              // 全局CSS类名
  style?: React.CSSProperties     // 全局样式
  allowDangerousHtml?: boolean    // 是否允许HTML渲染
  unknownNodeHandler?: (node) => React.ReactElement | null
}
```

### 预设配置

- `defaultConfig` - 默认配置
- `safeConfig` - 安全配置（禁用 HTML）
- `fullConfig` - 完整配置（启用 HTML）

## 支持的节点类型

- ✅ **文档结构**: root, paragraph, heading
- ✅ **文本格式**: text, emphasis, strong, delete
- ✅ **代码**: inlineCode, code
- ✅ **链接媒体**: link, image
- ✅ **列表**: list, listItem （支持任务列表）
- ✅ **其他**: blockquote, break, thematicBreak, html

## 示例

### 完整示例

```tsx
import React from 'react'
import {
  useMDASTRenderer,
  useRendererConfig,
  type HeadingRenderProps,
  type LinkRenderProps
} from 'lib/render'

// 自定义组件
const CustomHeading = ({ level, children }: HeadingRenderProps) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements
  return (
    <Tag className={`heading-${level}`} style={{ marginTop: '1em' }}>
      {level <= 2 && '🎯 '}{children}
    </Tag>
  )
}

const CustomLink = ({ href, children }: LinkRenderProps) => (
  <a
    href={href}
    style={{ color: '#007acc', textDecoration: 'none' }}
    onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
    onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
  >
    🔗 {children}
  </a>
)

function MarkdownRenderer({ tree }) {
  const config = useRendererConfig({
    heading: CustomHeading,
    link: CustomLink,
  }, {
    className: 'markdown-content',
    style: { lineHeight: 1.6 }
  })

  const { render } = useMDASTRenderer(config)

  return (
    <div className="document">
      {render(tree)}
    </div>
  )
}

export default MarkdownRenderer
```

## 开发指南

### 创建自定义渲染器

每个渲染器都接收特定的 props：

```tsx
// 所有渲染器都有的基础props
interface BaseRenderProps {
  node: MDAST.Node          // 原始节点
  children?: React.ReactNode // 子节点（如果有）
  className?: string        // CSS类名
  style?: React.CSSProperties // 样式
}

// 特定渲染器还有额外的props
interface HeadingRenderProps extends BaseRenderProps {
  node: MDAST.Heading
  level: 1 | 2 | 3 | 4 | 5 | 6  // 标题级别
}
```

### 调试

使用调试 Hook：

```tsx
import { useMDASTDebug } from 'lib/render'

function DebugViewer({ tree }) {
  const { totalNodes, nodeTypes, logDebugInfo } = useMDASTDebug(tree)

  return (
    <div>
      <button onClick={logDebugInfo}>打印调试信息</button>
      <p>总节点数: {totalNodes}</p>
      <p>节点类型: {nodeTypes.join(', ')}</p>
    </div>
  )
}
```

## License

MIT
