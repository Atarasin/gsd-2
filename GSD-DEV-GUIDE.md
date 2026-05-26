# GSD 开发调试指南

本文档指导如何在修改 GSD 源码后进行编译，并通过 `gsd-dev` 运行自定义版本。

---

## 快速上手

### 1. 修改源码

编辑任意 TypeScript 源文件，例如：

- `src/` — 主程序代码
- `src/resources/extensions/` — Extension 扩展代码
- `packages/` — Monorepo 工作区包

### 2. 编译

在项目根目录执行：

```bash
npm run build:core
```

这会依次完成：

1. 编译工作区包（contracts / pi-tui / pi-ai / pi-agent-core / pi-coding-agent / rpc-client / mcp-server）
2. 编译主程序 TypeScript（`src/` → `dist/`）
3. 复制资源文件（`src/resources` → `dist/resources`）
4. 复制主题和导出 HTML 模板

### 3. 运行

打开新的 PowerShell 窗口，执行：

```powershell
gsd-dev
```

或带参数：

```powershell
gsd-dev --version
gsd-dev headless
```

---

## 常见场景

### 场景 A：修改了 `src/` 下的主程序代码

```bash
npm run build:core
```

然后直接用 `gsd-dev`。

### 场景 B：修改了 Extension 资源文件（`src/resources/extensions/`）

如果只改了非 TS 文件（如 JSON、配置、模板），可以只复制资源：

```bash
npm run copy-resources
```

如果改了 TS 文件，仍需完整编译：

```bash
npm run build:core
```

### 场景 C：修改了 `packages/` 下的工作区包

```bash
npm run build:core
```

这会同时编译所有依赖的工作区包。

### 场景 D：只改了某个特定包

例如只改了 `@gsd/pi-ai`：

```bash
npm run build:pi-ai
npm run build:core
```

注意：单独编译包后，仍需 `build:core` 确保主程序引用了最新版本。

---

## 验证编译结果

检查关键文件是否存在：

```bash
# 主入口
ls dist/loader.js

# Extension 资源（应为 .js，而非 .ts）
ls dist/resources/extensions/gsd/onboarding-state.js
```

---

## 常见问题

### Q1：`gsd-dev` 报错找不到 `dist/loader.js`

原因：`tsc` 编译失败或 `dist` 目录被删除。

解决：

```bash
rm -f tsconfig.tsbuildinfo
npm run build:core
```

> `tsconfig.tsbuildinfo` 是 TypeScript 增量编译缓存。如果手动删除了 `dist` 但保留了该缓存文件，`tsc` 会认为无需重新编译。

### Q2：`gsd-dev` 报错找不到 `dist/resources/extensions/xxx.js`

原因：`copy-resources` 步骤失败，导致 `.ts` 文件没有被编译为 `.js`。

解决：

```bash
rm -rf dist
rm -f tsconfig.tsbuildinfo tsconfig.resources.tsbuildinfo
npm run build:core
```

### Q3：修改了源码但 `gsd-dev` 行为没有变化

原因：可能修改的是 `src/` 文件，但没有重新编译，或者 `gsd-dev` 实际运行的是旧缓存。

解决：

1. 确认修改保存了
2. 重新执行 `npm run build:core`
3. 检查 `dist/` 中对应文件的时间戳是否更新
4. 重启 PowerShell 再试

---

## 完整重新编译（清理后）

如果构建状态混乱，彻底清理后重编：

```bash
# 清理
rm -rf dist
rm -f tsconfig.tsbuildinfo tsconfig.resources.tsbuildinfo

# 重编
npm run build:core
```

---

## `gsd-dev` 配置说明

`gsd-dev` 是在 PowerShell profile 中定义的别名：

```powershell
function gsd-dev {
    & node D:\Projects\gsd-2\dist\loader.js @args
}
```

配置文件位置：

```
C:\Users\<用户名>\Documents\PowerShell\Microsoft.PowerShell_profile.ps1
```

如需修改别名名称或路径，编辑上述 profile 文件。

---

## 与官方版共存

- `gsd` — 全局安装的官方版本（保留不动）
- `gsd-dev` — 本地开发版本（通过本指南维护）

两者互不干扰。
