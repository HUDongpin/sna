# OPEN SNA 全功能检查报告

检查日期：2026-08-22（Asia/Hong_Kong）  
本地仓库：`/Volumes/Starship/SNA`  
生产站点：<https://www.sna.hk>  
检查基线：`main` / `682ee730f6d954fb5dfec362d8535db171c7f3eb`  
远端一致性：检查开始时本地 `HEAD` 与 `origin/main` 完全相同，工作树干净  
检查性质：只读功能与质量检查；未提交、推送、部署或修改产品源码

## 1. 最终结论

**目前不能认定 OPEN SNA 的每个功能都能正常运行。**

站点主体功能总体稳定：三语页面、导航、News、Academy、About、Open SNA 预计算参考结果、八个分析面板、图谱探索、搜索、筛选、分页、课程顺序导航和移动端布局均有通过证据。生产站点地图中的 229 条 URL 最终全部可达，Open SNA 线上页面的八个分析面板也全部能在真实浏览器中显示，浏览器控制台未发现错误。

但是，生产环境的核心自定义分析入口当前不可用：向 `https://www.sna.hk/api/open-sna/analyze` 上传一份符合合同且不含真实人员数据的合成 XLSX 后，生产端返回：

```text
HTTP 503
code: R_ENGINE_NOT_CONFIGURED
The production R analysis service is not configured. You can still inspect the aggregate reference analysis.
```

这说明生产站点的安全失败机制正常，但用户无法在生产环境完成“上传自己的 XLSX → 执行 R 网络分析 → 获取结果”这一核心闭环。因此整站应判定为：

> **部分可用（Partially operational），不满足“所有功能正常”的标准。**

另外，本地真实 R 分析能够成功完成，但 GPT-5.6 Luna 解释在两次当前调用中都不可用，系统按设计回退到确定性的 R 解释。回退保证了结果仍可使用，但 AI 解释功能当前处于降级状态。

## 2. 状态总览

| 功能域 | 当前状态 | 核心证据 |
| --- | --- | --- |
| Git 基线与仓库卫生 | 通过 | `main` 与 `origin/main` 同为 `682ee73...`；检查前工作树干净 |
| 三语站点与全量页面路由 | 通过 | 本地 229/229；生产首轮 225/229 在 10 秒内完成，4 条逐条复测均 200，最终 229/229 可达 |
| 首页、Mission、About | 通过 | 真实浏览器导航、主标题与 About 公共工具链接存在 |
| News | 通过 | 36 篇文章；搜索、类型筛选、6 页分页、详情、繁体切换均通过 |
| Academy | 通过 | 35 个教程；搜索、轨道/级别筛选、6 页分页、详情、前后教程、简体切换均通过 |
| Open SNA 预计算参考结果 | 通过 | 线上与本地八个面板 8/8 可切换并显示对应聚合结果 |
| Open SNA 图谱交互 | 大部分通过 | 缩放、社区显隐、节点检查、前后面板、桌面/移动节点选择通过；边权滑杆未被当前自动化通道独立确认 |
| Open SNA 表格交互 | 通过 | 中心性与桥接节点搜索、结果计数、列排序和 `aria-sort` 状态通过 |
| Open SNA 本地 XLSX 分析 | 通过但 AI 降级 | 合成 XLSX 返回 200；R 分析完整；LUNA 暂不可用，回退到 R 解释 |
| Open SNA 生产 XLSX 分析 | **失败 / 阻断** | 生产 API 返回 503 `R_ENGINE_NOT_CONFIGURED` |
| GPT-5.6 Luna 实时解释 | **降级** | 本地两次真实分析都提示 LUNA 暂不可用；确定性 R 回退正常 |
| JSON / Node CSV 下载 | 未完全确认 | 下载源码与按钮存在并通过类型构建；内置浏览器未捕获 Blob 下载事件 |
| 生产构建 | 条件通过 | Webpack 构建成功；默认 Turbopack 构建因本机端口权限失败 |

## 3. 检查范围与方法

本次没有只做首页烟雾检查，而是从实际路由、组件、测试和运行合同建立功能清单，并分五层取证：

1. **仓库与来源状态**：分支、远端、工作树、linked worktree、最近提交和 Vercel 项目绑定。
2. **静态合同与自动化**：单元/合同测试、TypeScript、生产构建、发布卫生和 R 包预检。
3. **本地真实浏览器**：页面导航、搜索、筛选、分页、详情、语言切换、移动菜单和 Open SNA 交互。
4. **本地真实分析 API**：无效 XLSX 拒绝、有效合成 XLSX 的真实 R 分析、隐私输出和 AI 回退。
5. **生产只读验证**：官方域名、重定向、站点地图全量路由、线上浏览器交互、生产分析 API。

测试数据使用一份临时生成的 80 行合成工作簿：

- 6 个网络项目：`IS1-IS3`、`CJ1-CJ3`
- 2 个构念社区
- `Gender` 两组，各 40 行
- Likert 整数范围 1-5
- 不含真实人员资料

检查结束后该工作簿及伪 XLSX 均已从本地删除，未加入 Git。生产请求因 R worker 未配置而未进入分析；本轮未发现持久化产物，但没有权限独立审计 Vercel 的瞬时请求内存或平台日志。

## 4. 自动化与构建结果

### 4.1 合同测试

命令：

```bash
npm run test
```

结果：

```text
tests 33
pass 33
fail 0
skipped 0
```

覆盖内容包括：

- 三个 locale 字典结构与完整性；
- Home、Mission、Open SNA、News、Academy、About 路由；
- News 语料、搜索、筛选、分页、图片尺寸与同图合同；
- Academy 语料、搜索、筛选、分页、顺序与结构化数据；
- Open SNA 八个面板、可访问性交互、R 方法合同和聚合数据合同；
- 上传路由的 R 运行时、工作簿和分析故障分类；
- Luna 的聚合边界、严格 JSON、零数据保留配置和确定性回退；
- 主机、别名重定向、Logo、Hero、About 图像与结构化元数据；
- 无数据库、定时发布和邮件依赖的架构约束。

### 4.2 R 运行时预检

命令：

```bash
npm run open-sna:r-preflight
```

结果：通过。

| 运行时/包 | 实测版本 |
| --- | --- |
| R | 4.4.2 |
| jsonlite | 2.0.0 |
| readxl | 1.4.5 |
| qgraph | 1.9.8 |
| huge | 1.5 |
| mgm | 1.2.15 |
| bootnet | 1.8 |
| networktools | 1.6.0 |
| NetworkComparisonTest | 2.2.3 |

### 4.3 类型、构建与发布卫生

| 检查 | 结果 | 说明 |
| --- | --- | --- |
| `npm run typecheck` | 通过 | TypeScript 退出码 0 |
| `npm run release:hygiene` | 通过 | tracked files 与 patch whitespace 检查通过 |
| `git diff --check` | 通过 | 无空白错误 |
| `next build --webpack` | 通过 | 编译、TypeScript、页面数据、237 个静态页面生成全部成功 |
| `npm run release:verify` | 失败 | 33 项测试先通过，随后默认 Turbopack 构建在内部端口绑定处失败 |

默认构建的失败摘要：

```text
TurbopackInternalError
creating new process
binding to a port
Operation not permitted (os error 1)
```

同一份源码改用 Webpack 后完整构建通过。因此这是当前机器/Turbopack 执行环境阻断，不是已证实的源码编译错误；但从运维角度，默认 `npm run build` 和 `npm run release:verify` 在本机仍是红色，不能忽略。

## 5. 全站路由与全球功能

### 5.1 路由完整性

生产站点地图包含 229 条 URL：

- 三语 Home、Mission、About；
- canonical Open SNA；
- 三语 News 索引与 36 × 3 = 108 个 News 详情页；
- 三语 Academy 索引与 35 × 3 = 105 个 Academy 详情页。

本地 warm-cache 串行检查：

```text
229/229 HTTP 200
```

生产并发检查：

```text
225/229 在单条 10 秒上限内返回 200
4/229 首轮超时或连接错误
4 条逐条复测均返回 200
最终可达性：229/229
```

首次生产并发检查中慢/不稳定的四条 URL：

- `/en/news/education-outside-classroom-peer-networks`
- `/zh-hant/academy/build-bipartite-affiliation-networks`
- `/zh-hans/news`
- `/zh-hans/news/campus-behavioral-big-data-peer-networks`

逐条复测耗时约 3.0-6.6 秒，均为 HTTP 200。这不能判为稳定功能故障，但显示出冷缓存或并发情况下的响应时间波动；本次没有执行正式负载测试。

### 5.2 重定向与主机

| 路径 | 实测行为 |
| --- | --- |
| `/news` | 307 → `/en/news` |
| `/academy` | 307 → `/en/academy` |
| `/mission` | 307 → `/en/mission` |
| `/open-sna` | 307 → `/en/open-sna` |
| `/about` | 307 → `/en/about` |
| `/research-news` | 308 → `/en/news` |
| `https://sna.hk/en/open-sna` | 308 → `https://www.sna.hk/en/open-sna` |

生产 Open SNA 响应为 HTTP/2 200，Vercel 提供，HSTS 开启，页面命中 Vercel 缓存。

### 5.3 语言与导航

通过项：

- Header/Footer 顺序为 Home → Mission → Open SNA → News → Academy → About；
- 英文详情切换繁体后，URL 与 `html lang` 变为 `zh-Hant-HK`；
- 英文课程切换简体后，URL 与 `html lang` 变为 `zh-Hans-CN`；
- 新闻与课程详情标题实际切换为相应中文；
- 390 × 844 视口下移动菜单可展开并显示 News、Academy 等入口；
- Home、News、Academy、Open SNA 在 390 px 视口均未出现页面级水平溢出；
- 回到顶部按钮在滚动后出现，点击后 `window.scrollY` 返回 0。

## 6. 页面功能检查

### 6.1 首页

状态：通过。

- 主标题正常显示；
- `Our mission` CTA 实际导航到 `/en/mission`；
- 首页到 Mission、News、About 的入口存在；
- Hero 图片和页面合同测试通过。

非阻断警告：Next 开发日志建议首屏 Hero 图片使用 eager loading，以改善 LCP。当前未执行 Lighthouse 或真实用户 Web Vitals 测试，不能从本轮数据判定生产 LCP 是否达标。

### 6.2 Mission

状态：通过。

- 页面返回 200；
- 浏览器主标题为 `Make relationships visible, measurable, and useful.`；
- 从首页 CTA 和 Header 均能到达。

### 6.3 About

状态：通过，但一个外部站点很慢。

- About 页面和本地画像正常；
- 6 个页面内公共工具/网站链接存在；
- `hudongpin.com`、`pedanova.tech`、GitHub `sna.js` 均返回 200；
- `3dena.com` 已返回 HTTP 200 并持续传输内容，但在 20 秒和 35 秒两次上限内都未完成下载，表现为严重缓慢的外部依赖，不是 SNA.HK 内部路由 500。

### 6.4 News

状态：通过。

数据与交互证据：

- 当前 corpus：36 篇；
- 每页 6 篇，共 6 页；
- 搜索 `rich clubs`：返回 1 篇；
- 类型筛选 `conference`：返回 3 篇；
- 第 2 页：实际显示 6 张文章卡；
- 从列表进入详情页成功；
- 英文详情切换繁体成功；
- 线上搜索同样返回 1 篇；
- 108 个三语详情路由全部包含在最终 229/229 可达结果中。

### 6.5 Academy

状态：通过。

数据与交互证据：

- 当前 corpus：35 个教程；
- 每页 6 个，共 6 页；
- 搜索 `ERGM`：返回 2 个教程；
- `Responsible Application + Advanced` 组合筛选：返回 6 个教程；
- 第 2 页：实际显示 6 张课程卡；
- 详情页包含恰好 3 个学习目标和 4 个步骤；
- Previous/Next tutorial 各有一个，并能实际导航到下一课；
- 英文课程详情切换简体成功；
- 线上搜索同样返回 2 个教程；
- 105 个三语详情路由全部包含在最终 229/229 可达结果中。

## 7. Open SNA 参考工作台

### 7.1 页面加载与参考结果

状态：通过。

- 本地与生产 `/en/open-sna` 均返回 200；
- 预计算 Programming Resilience 聚合结果能够加载；
- 参考结果显示 811 responses、16 nodes、46 nonzero edges；
- 生产浏览器最终状态为 `Ready`；
- 生产浏览器控制台错误数：0。

### 7.2 八个分析面板

本地和生产均逐个点击验证，8/8 通过：

1. Data Overview
2. Network Visualization
3. Centrality Analysis
4. Bridge Node Analysis
5. Predictability Analysis
6. Subgroup Comparison (NCT)
7. Stability Analysis
8. AI Interpretation

每个面板点击后 `aria-selected=true`，对应 `tabpanel` 可见并包含该分析的实际聚合数据。

### 7.3 图谱探索

通过项：

- Zoom in 能改变缩放状态，并使 Zoom out 可用；
- Reset network view 恢复到 100%；
- 关闭 `Cmt` 社区后，图中边数从 46 降到 31；重新开启后恢复；
- 点击 `Cmt1` 后，节点检查器显示 strength、predictability、visible ties 和最强连接；
- 按 Escape 后节点检查器清空；
- Next/Previous 面板按钮能在 Network 与 Centrality 间移动；
- 移动端可通过 `Jump to analysis` 进入 Network；
- 移动端节点选择器选择 `Cmt1` 后，节点检查器显示正确数据。

未完全确认项：

- 范围滑杆 `Minimum absolute edge weight` 已存在，源码含 `onChange` 状态绑定，合同测试确认了 range 控件的存在；但当前内置浏览器的 `fill`、键盘和坐标拖动都未能改变滑杆值。因此本轮不能独立证明实际拖动后会过滤边，也不能据此判定产品故障。

### 7.4 中心性与桥接节点表格

状态：通过。

- 中心性搜索 `Cmt1`：从 16 行过滤为 1 行；
- 中心性 Node 列点击后 `aria-sort=ascending`；
- 桥接节点搜索 `Cop4`：从 16 行过滤为 1 行；
- Bridge strength 列点击后 `aria-sort=ascending`。

### 7.5 设置、精度与移动折叠

状态：通过。

- bootstrap 选择能在 100 与 1,000 间切换；
- Method settings 能展开并显示 profile、gamma、NCT 和 seed；
- 390 × 844 视口下分析设置默认折叠；
- Expand analysis setup 后，Choose workbook 和 Stability precision 均可见；
- 移动端使用 8 项 Jump to analysis 下拉，避免桌面 tab 横向溢出。

### 7.6 JSON 与 Node CSV 下载

状态：未完全确认。

- 两个按钮在本地与生产界面均存在；
- 源码使用 Blob + download anchor 生成 `open-sna-results.json` 和 `open-sna-node-metrics.csv`；
- 自动化合同覆盖聚合 JSON 与节点 CSV 数据生成边界；
- 但本轮内置浏览器在点击后没有向自动化 API 发出 download event，等待 10 秒超时，控制台也没有错误。

因此不能把下载功能判为失败，也不能声称已完成真实下载验证。建议加入仓库自有 Playwright E2E，以真实 Chromium 对文件名、MIME、内容和隐私字段进行断言。

## 8. 自定义 XLSX 分析与隐私边界

### 8.1 无效 XLSX

状态：通过。

向本地 API 上传扩展名为 `.xlsx` 但内容不是 ZIP/XLSX 的文件，返回：

```text
HTTP 415
The file extension is XLSX, but the file contents are not a valid XLSX container.
```

说明扩展名与容器签名检查生效。

自动化测试还覆盖以下错误分类：

- 503 `R_RUNTIME_NOT_READY`
- 422 `WORKBOOK_INVALID`
- 500 `R_ANALYSIS_FAILED`

### 8.2 本地有效 XLSX

状态：R 通过，LUNA 降级。

真实 API 结果：

| 字段 | 结果 |
| --- | --- |
| HTTP | 200 |
| 耗时 | 约 11 秒 |
| schemaVersion | 1.0 |
| dataSource | uploaded-workbook |
| analyzed rows | 80 |
| nodes | 6 |
| nonzero edges | 10 |
| bootstraps | 100 |
| NCT permutations | 1,000 |
| input fingerprint | SHA-256 格式 |
| rawRowsIncluded | false |
| records/rawData | 不存在 |
| thirdPartyAiUsed | false |
| interpretation generator | Deterministic evidence-bound rules implemented in R |

两次当前真实调用都返回相同 AI 降级警告：

```text
LUNA AI interpretation is temporarily unavailable; the deterministic R evidence summary is shown.
```

回退路径正确，结果没有因为外部 AI 不可用而丢失；但 Luna 的当前实时生成能力没有通过。

### 8.3 生产有效 XLSX

状态：**阻断 / 不可用。**

同一份合成 XLSX 发往生产 API：

```text
HTTP 503
code: R_ENGINE_NOT_CONFIGURED
```

生产站点可以展示参考结果，却不能执行用户工作簿分析。这是本次“所有功能是否正常”问题的决定性否定证据。

### 8.4 上传 UI 的浏览器限制

内置浏览器没有为文件输入触发 file chooser event；系统 Chrome 又在页面加载前被本机环境 `SIGKILL`，Playwright Firefox 下载也因 CDN 长时间无进度而终止。因此：

- 真实文件选择器 UI 未在浏览器中完成端到端验证；
- 同一 multipart API、同一 R 路由、同一合成工作簿已通过终端真实请求验证；
- 这属于测试环境缺口，不应被写成产品上传 UI 失败。

## 9. 发现的问题与优先级

### F-01：生产自定义 XLSX 分析服务未配置

- 优先级：**P0 / 发布阻断**
- 影响：所有生产用户都无法运行自己的工作簿分析。
- 证据：生产 API 返回 503 `R_ENGINE_NOT_CONFIGURED`。
- 当前安全性：失败关闭，没有用参考结果伪装用户分析。
- 建议：部署并版本锁定独立 R worker，完成 `OPEN_SNA_R_API_URL`、鉴权、请求大小、ZIP 展开限制、CPU/内存/并发、超时、取消、短期存储清理和无网络出口验证；随后用真实浏览器完成生产端到端上传。

### F-02：GPT-5.6 Luna 当前不可用

- 优先级：**P1 / 功能降级**
- 影响：本地上传分析只能看到确定性 R 解释，不能获得 Luna 聚合解释。
- 证据：两次真实分析均提示 temporarily unavailable，`thirdPartyAiUsed=false`。
- 当前安全性：回退正常，未暴露原始行、文件名、sheet 名、ID 或指纹给 AI 输出。
- 建议：在服务器端查看并分类 OpenRouter 响应状态、模型可用性、严格 JSON 兼容性与超时；仅记录脱敏错误码，不记录 key 或聚合请求内容。

### F-03：默认生产构建命令在当前机器失败

- 优先级：**P1 / 工程门禁**
- 影响：`npm run build` 与 `npm run release:verify` 当前退出 1。
- 证据：Turbopack 内部端口绑定 `Operation not permitted`。
- 缓解：Webpack 构建完整通过。
- 建议：明确 CI/发布到底使用 Turbopack 还是 Webpack；若当前环境必须使用 Webpack，应把可复现命令固化到发布脚本，而不是依赖人工绕行。

### F-04：生产冷缓存/并发响应波动

- 优先级：P2 / 性能观察
- 影响：4 条生产页面在并发抓取的 10 秒窗口中超时或连接失败；单独复测约 3.0-6.6 秒后成功。
- 建议：用受控的生产性能测试采集 TTFB、缓存命中、区域、P95/P99 和并发行为；本轮数据不足以称为负载测试。

### F-05：3D ENA 外部链接目标极慢

- 优先级：P2 / 外部依赖
- 影响：用户点击 About 中的 3D ENA 后，目标服务器虽返回 200，但在 35 秒内仍未完成传输。
- 建议：检查 `3dena.com` 的首包、资源体积、CDN 和图片/脚本加载；SNA.HK 链接本身有效。

### F-06：浏览器下载与边权滑杆缺少一方 E2E 证据

- 优先级：P2 / 测试覆盖
- 影响：本轮无法独立确认 Blob 文件落盘和滑杆拖动后的边过滤。
- 建议：增加仓库内 Playwright 测试，断言下载文件名/内容、滑杆值变化、可见边数和键盘可访问性。

### F-07：Next 开发期非阻断警告

- 优先级：P3
- 警告：smooth-scroll route transition 提示；Hero LCP eager loading 提示。
- 建议：按 Next 16.3 当前文档处理，并用真实 Lighthouse/Web Vitals 结果决定是否需要产品改动。

## 10. 未覆盖或不能过度声称的范围

以下项目不应被本报告误写为“已通过”：

- 生产自定义工作簿分析：明确失败；
- Luna 实时解释：明确降级；
- JSON/CSV 实际落盘和内容打开：浏览器通道未确认；
- 图谱边权滑杆的真实拖动过滤：浏览器通道未确认；
- 系统 Chrome 跨浏览器兼容性：Chrome 在应用加载前被本机环境终止；
- Safari/WebKit、Firefox 的兼容性：未完成；
- 屏幕阅读器、VoiceOver、人工键盘全流程：未执行；
- Lighthouse、Core Web Vitals、INP、正式负载/压力测试：未执行；
- R 1,000 bootstrap 的生产异步任务：生产 worker 不存在，无法执行；
- 所有外部论文 DOI 的实时可达性和付费墙行为：合同验证了 HTTPS/source 字段，但本轮未逐条访问；
- GitHub push、Vercel 部署或生产改动：本轮未授权，也未执行。

## 11. 建议的修复与复测顺序

1. **先解决 F-01**：部署受约束的 R worker，配置生产服务地址并验证清理、超时和资源限制。
2. **再解决 F-02**：修复 Luna/OpenRouter 实时解释，但继续保留确定性 R 回退。
3. **固化构建门禁**：让默认 `npm run release:verify` 在目标发布环境真正为绿。
4. **添加一方浏览器 E2E**：文件选择、上传、进度、成功/失败、下载、滑杆、节点键盘交互和移动端折叠。
5. **执行生产端到端**：合成 XLSX → R worker → 严格聚合 JSON → Luna 或明确回退 → 八面板渲染 → JSON/CSV 下载。
6. **执行性能与可访问性专项**：生产 P95/P99、Lighthouse、VoiceOver 和移动设备实机。

在完成第 1、2、3、5 项之前，不建议对外宣称“OPEN SNA 所有功能均正常运行”。

## 12. 复现命令摘要

```bash
git fetch origin --prune
git status --short --branch
git rev-parse HEAD origin/main

npm run test
npm run open-sna:r-preflight
./node_modules/.bin/next build --webpack
npm run typecheck
npm run release:hygiene
git diff --check
```

本地预览使用：

```bash
./node_modules/.bin/next dev --webpack --hostname 127.0.0.1 --port 3068
```

注意：报告中的工作簿上传验证使用临时合成数据；临时文件已删除。真实凭据值从未打印、复制、提交、截图或写入报告。
