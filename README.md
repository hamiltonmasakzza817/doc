# React Flow BPMN Demo - Camunda 8 导出与条件分支

一个基于 React Flow 的流程设计工具，支持导出为 Camunda 8 兼容的 BPMN 2.0 XML 格式。

## 功能特性

### 1. 可视化流程设计
- **开始节点 (Start Event)**: 流程的起点
- **结束节点 (End Event)**: 流程的终点
- **任务节点 (Task/Service Task)**: 执行具体业务逻辑
- **排他网关 (Exclusive Gateway)**: 条件分支，只执行一个满足条件的分支
- **包容网关 (Inclusive Gateway)**: 多路分支，可同时执行多个满足条件的分支

### 2. 条件规则配置
支持两种方式配置边的条件：

#### 简单模式
使用表达式语法直接编写条件，例如：
```
${amount > 1000}
${status == "approved"}
```

#### 可视化规则模式（推荐）
类似 n8n 的 IF 节点，通过可视化界面配置条件：
- 支持多种操作符：等于、不等于、大于、小于、包含、开始于、结束于等
- 支持多条件组合：AND / OR 逻辑
- 支持多种数据类型：字符串、数字、布尔值、日期

#### 默认分支
可将任意边设置为默认分支，当所有其他条件都不满足时，将执行默认分支。

### 3. BPMN 导出 (Camunda 8/Zeebe)

点击 **"导出 BPMN (Camunda 8)"** 按钮，将当前流程导出为标准 BPMN 2.0 XML 文件。

#### 节点映射关系
| React Flow 节点 | BPMN 元素 | Zeebe 扩展 |
|----------------|-----------|-----------|
| 开始节点 | `startEvent` | - |
| 结束节点 | `endEvent` | - |
| 任务节点 | `serviceTask` | `zeebe:taskDefinition` |
| 排他网关 | `exclusiveGateway` | - |
| 包容网关 | `inclusiveGateway` | - |

#### 条件表达式
- 使用 FEEL (Friendly Enough Expression Language) 语法
- 自动从可视化规则转换为 FEEL 表达式
- 通过 `zeebe:conditionExpression` 扩展元素注入

#### 默认分支
- 排他网关的默认分支通过 `default` 属性指定
- 默认分支在所有条件分支都不满足时执行

#### 验证规则
导出前会自动验证流程：
- ✅ 必须包含至少一个开始节点
- ✅ 必须包含至少一个结束节点
- ✅ 网关节点必须至少有 2 条出边
- ✅ 排他网关只能有一条默认分支
- ✅ 所有连接线的源节点和目标节点必须存在

### 4. BPMN DI (图形信息)
导出的 BPMN 文件包含完整的图形位置信息（BPMNDiagram, BPMNPlane, BPMNShape, BPMNEdge），可以在 Camunda Modeler 中打开并可视化查看。

## 技术栈

- **React 18** + **TypeScript** + **Vite**
- **React Flow**: 可视化流程编辑器
- **bpmn-moddle**: BPMN 2.0 模型构建与序列化
- **zeebe-bpmn-moddle**: Camunda 8/Zeebe 扩展支持
- **Radix UI**: 现代化 UI 组件库
- **Tailwind CSS**: 样式框架

## 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

## 使用说明

### 创建流程
1. 从左侧工具栏拖拽节点到画布
2. 连接节点创建流程流
3. 点击节点设置属性（名称、描述等）
4. 点击连接线设置条件规则

### 配置网关条件
1. 创建排他网关或包容网关
2. 从网关连出至少 2 条边到不同的目标节点
3. 点击每条边，设置条件或标记为默认分支
4. 排他网关必须有一条默认分支或所有分支都有条件

### 导出 BPMN
1. 点击工具栏的 **"导出 BPMN (Camunda 8)"** 按钮
2. 系统会自动验证流程
3. 如果验证通过，将下载 `.bpmn` 文件
4. 文件名格式：`workflow-YYYYMMDD-HHmmss.bpmn`

### 导入导出
- **导出流程 JSON**: 保存当前流程为 JSON 格式（包含完整的 React Flow 状态）
- **导入流程**: 加载之前导出的 JSON 文件
- **导出 BPMN**: 导出为 Camunda 8 兼容的 BPMN 2.0 XML

## 示例流程

### 简单审批流程
```
开始 → 排他网关(金额判断) → 小额审批 → 结束
                        ↘ 大额审批 → 结束
```

条件配置：
- 分支1: `amount > 10000` → 大额审批
- 分支2: 默认分支 → 小额审批

### 多条件流程
```
开始 → 排他网关(状态判断) → 处理A → 结束
                       ↘ 处理B → 结束
                       ↘ 处理C → 结束
```

条件配置：
- 分支1: `status = "pending" and priority >= 5` → 处理A
- 分支2: `status = "urgent"` → 处理B
- 分支3: 默认分支 → 处理C

## Camunda 8 集成

### 在 Camunda Modeler 中查看
1. 下载并安装 [Camunda Modeler](https://camunda.com/download/modeler/)
2. 打开导出的 `.bpmn` 文件
3. 查看和编辑流程定义

### 部署到 Zeebe
```bash
# 使用 zbctl 部署流程
zbctl deploy workflow-20241101-120000.bpmn

# 创建流程实例
zbctl create instance workflow-20241101-120000 --variables '{"amount": 15000}'
```

### FEEL 表达式示例
```
# 数字比较
amount > 1000
price >= 100 and price <= 500

# 字符串操作
status = "approved"
contains(name, "test")
starts with(email, "admin")

# 布尔判断
isActive = true
flag != false

# 空值检查
value = null
value != null

# 逻辑组合
amount > 1000 and status = "pending"
type = "A" or type = "B"
```

## 限制与注意事项

1. **网关约束**
   - 排他网关和包容网关必须至少有 2 条出边
   - 排他网关只能有一条默认分支
   - 建议为所有非默认分支配置条件表达式

2. **表达式语法**
   - 使用 FEEL 表达式语法
   - 变量名区分大小写
   - 字符串值需要使用双引号

3. **节点命名**
   - 任务节点的 `zeebe:taskDefinition type` 自动从节点名称生成
   - 建议使用有意义的英文名称或拼音
   - 避免使用特殊字符

4. **导出验证**
   - 导出前会自动验证流程完整性
   - 如果验证失败，会显示具体的错误信息
   - 必须修复所有错误才能成功导出

## 项目结构

```
src/
├── components/
│   ├── nodes/           # 节点组件
│   │   ├── StartNode.tsx
│   │   ├── EndNode.tsx
│   │   ├── TaskNode.tsx
│   │   ├── ExclusiveGateway.tsx
│   │   └── InclusiveGateway.tsx
│   ├── Toolbar.tsx      # 工具栏
│   ├── EdgeEditor.tsx   # 边条件编辑器
│   ├── PropertyPanel.tsx # 节点属性面板
│   ├── RuleBuilder.tsx  # 规则构建器
│   └── ui/              # UI 组件库
├── types/
│   └── flow.ts          # 类型定义
├── utils/
│   ├── bpmn/
│   │   ├── exportBpmn.ts      # BPMN 导出逻辑
│   │   └── zeebeDescriptors.ts # Zeebe 扩展描述
│   └── ruleUtils.ts     # 规则工具函数
└── App.tsx              # 主应用组件
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 参考资料

- [BPMN 2.0 规范](https://www.omg.org/spec/BPMN/2.0/)
- [Camunda 8 文档](https://docs.camunda.io/)
- [FEEL 表达式语法](https://docs.camunda.io/docs/components/modeler/feel/what-is-feel/)
- [React Flow 文档](https://reactflow.dev/)
