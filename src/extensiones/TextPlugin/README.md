# TextPlugin 文件结构说明

## 📁 文件夹结构

```
src/extensiones/TextPlugin/
├── index.ts                     # 主入口文件
├── README.md                    # 说明文档
├── core/
│   └── index.ts                # 核心功能（插件主逻辑）
├── utils/
│   ├── pathUtils.ts            # 路径工具类
│   └── selection.ts            # Selection & Range 系统
├── components/
│   └── customComponents.tsx    # 自定义React组件
├── extensions/
│   ├── micromarkTextExtension.ts      # micromark扩展
│   └── fromMaekdownTextExtention.ts   # markdown转换扩展
├── constants/
│   └── constant.ts             # 常量定义
└── styles/
    └── index.scss              # 样式文件
```

## 🎯 功能说明

### 核心功能 (core/)

- **textPlugin**: 主插件函数，注册 micromark 和 markdown 扩展
- **mdastDebugPlugin**: 调试插件，为 AST 节点添加路径信息
- **PathUtils**: 路径工具类，提供类似 Slate 的路径系统

### 组件 (components/)

- **customMarkdownComponents**: 自定义 ReactMarkdown 组件
- **DOMMapper**: DOM 到 AST 的映射工具

### 扩展 (extensions/)

- **micromarkTextExtension**: 词法分析阶段的扩展
- **fromMaekdownTextExtention**: AST 构建阶段的扩展

### 工具 (utils/)

- **pathUtils**: 路径系统工具函数
- **selection**: Selection & Range 系统，包含：
  - `Point`: 文档中的精确位置（路径 + 偏移量）
  - `Range`: 选择范围（anchor 点和 focus 点）
  - `Selection`: 编辑器选择状态（Range 或 null）
  - `PointUtils`: Point 操作工具类
  - `RangeUtils`: Range 操作工具类
  - `SelectionUtils`: Selection 操作工具类
  - `DOMSelectionConverter`: DOM Selection 转换器

### 常量 (constants/)

- **constant**: 令牌类型定义

### 样式 (styles/)

- **index.scss**: 自定义样式

## 🚀 使用方法

```typescript
import textPlugin, {
  mdastDebugPlugin,
  customMarkdownComponents,
  DOMSelectionConverter,
  SelectionUtils,
  RangeUtils,
  PointUtils
} from './extensiones/TextPlugin';

// 在ReactMarkdown中使用
<ReactMarkdown
  remarkPlugins={[textPlugin, mdastDebugPlugin]}
  components={customMarkdownComponents}
>
  {content}
</ReactMarkdown>
```

## 🎯 Selection 系统特性

### 数据结构

- **Point**: `{ path: number[], offset: number }` - 精确位置
- **Range**: `{ anchor: Point, focus: Point }` - 选择范围
- **Selection**: `Range | null` - 选择状态

### 核心功能

- ✅ 类似 Slate.js 的 Path 系统
- ✅ 精确的光标位置追踪
- ✅ 选择范围检测和分析
- ✅ DOM Selection 到 AST 的映射
- ✅ 折叠选择（光标）和展开选择的区分

## 🔧 控制台输出

现在系统会输出两种关键信息：

### 1. 光标位置信息

```
🔸 光标位置: [0,1]:5 (text)
```

- `[0,1]`: AST 路径（第 0 个节点的第 1 个子节点）
- `:5`: 在文本节点内的偏移量
- `(text)`: 节点类型

### 2. 选择内容信息

```
📝 选择文字: "Hello World" -> 对应MDAST: {
  startNode: { type: "text", value: "Hello World" },
  endNode: null,
  range: {
    start: "[0,1]:0",
    end: "[0,1]:11"
  }
}
```

这样可以保持控制台输出的简洁性，专注于核心的 Selection 映射关系。

## 💡 设计理念

参考 Slate.js 的 Selection 系统设计：
- 不可变数据结构
- 精确的位置表示
- 与 DOM 完全解耦
- 支持复杂的选择操作
- 便于扩展和维护
