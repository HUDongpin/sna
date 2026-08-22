# Open SNA「上传 XLSX → R 分析 → 查看结果」核心闭环修复与生产验收报告

**报告日期：** 2026-08-23  
**代码仓库：** `/Volumes/Starship/SNA`  
**生产页面：** `https://www.sna.hk/en/open-sna`  
**发布提交：** `2f1d34f0a7e6292cd50dc0b3b65b276c5694f530`  
**最终状态：** **已修复、已部署、已完成生产环境真实 XLSX 闭环验收**

## 1. 执行结论

此前 Open SNA 的核心流程无法在生产环境完成，表现为：用户可以选择 XLSX，但生产 Vercel 运行时没有 R 环境，也没有配置独立 R worker，合法请求最终返回 `503 R_ENGINE_NOT_CONFIGURED`。

本轮已经补齐并验证完整生产链路：

```text
用户选择 XLSX
  → www.sna.hk / Vercel Web adapter
  → HTTPS + Bearer token
  → Google Cloud Run R worker
  → R 4.4.2 统计分析
  → aggregate-only JSON
  → Open SNA 八个结果面板
```

生产验收使用一份无个人数据的真实 `.xlsx` 二进制文件。默认 UI 路径以 **1,000 次 case-dropping bootstrap + 1,000 次 NCT permutation** 完成，约 82 秒后显示 `Workbook analysis complete`。结果从内置参考数据切换为 `Uploaded workbook`，显示 80 responses、6 nodes、12 nonzero edges；八个面板均可打开且包含相应结果，页面自身没有 console error。

因此，本报告可以确认：

> Open SNA 现在能够在生产环境完成“上传自己的 XLSX → 执行 R 分析 → 查看分析结果”的核心闭环。

## 2. 根因与修复边界

### 2.1 根因

- Vercel 生产环境此前没有 `OPEN_SNA_R_API_URL`。
- Vercel 生产环境此前没有 `OPEN_SNA_R_API_TOKEN`。
- Vercel 函数运行时不包含项目固定的 R 4.4.2 与统计包环境。
- Web route 按设计在 Vercel 上 fail closed，因此不是前端文件选择器或 XLSX 解析脚本本身失效。

### 2.2 已实现的修复

- 为 `app/api/open-sna/analyze/route.ts` 增加专用 worker 模式。
- worker 使用至少 32 字符的 Bearer token，并以 constant-time 比较校验。
- Web adapter 只向 HTTPS worker 转发，并要求 URL/token 同时存在。
- worker 每个进程只允许一个活动 R 作业，超额请求返回受控的 `429 WORKER_BUSY`。
- 每个请求使用独立临时目录，并在 `finally` 中清理。
- worker 错误转换为有限、用户安全的公开错误码，不向浏览器返回 R stderr 或私有诊断。
- 增加固定 R 4.4.2 的两阶段容器、完整 `renv.lock`、非 root 用户和健康检查。
- 增加 Cloud Build、Artifact Registry、Secret Manager、专用 service account 与 Cloud Run 部署脚本。

## 3. GitHub 与 Vercel 发布证据

### 3.1 GitHub

- 已将获授权提交精确推送到 `origin/main`：

```text
2f1d34f0a7e6292cd50dc0b3b65b276c5694f530
```

- `git ls-remote origin refs/heads/main` 返回同一 SHA。
- 推送没有包含用户原有的未跟踪报告 `OPEN_SNA_FUNCTIONAL_QA_REPORT_2026-08-22.md`。

### 3.2 Vercel

Git 推送首先生成的生产部署：

```text
https://sna-cbxvq8z08-peter-dongpin-hu-s-projects.vercel.app
Status: READY
Git SHA: 2f1d34f0a7e6292cd50dc0b3b65b276c5694f530
```

在 worker 部署成功并写入生产变量后，对上述精确源部署执行了 production redeploy：

```text
Deployment ID: dpl_EDNMmn8WyUkxn9LwzMTVgx3uUByt
Deployment URL: https://sna-kl73193tv-peter-dongpin-hu-s-projects.vercel.app
Target: production
Ready state: READY
```

最终生产别名已经指向该 READY 部署：

- `https://sna.hk`
- `https://www.sna.hk`
- `https://sna-psi.vercel.app`

Vercel 生产变量清单显示：

| 变量 | 状态 | 环境 |
| --- | --- | --- |
| `OPEN_SNA_R_API_URL` | Encrypted | Production |
| `OPEN_SNA_R_API_TOKEN` | Encrypted | Production |
| `NEXT_PUBLIC_SITE_URL` | Encrypted | Production |

本报告未记录、打印或复制 token 明文。

## 4. Google Cloud 生产 worker 证据

### 4.1 项目与资源

| 项目 | 实际值 |
| --- | --- |
| Google Cloud project | `project-hu-xiangen` |
| Region | `asia-east2` |
| Artifact Registry repository | `open-sna` |
| Secret Manager secret | `open-sna-r-worker-token`，version 1 |
| Service account | `open-sna-r-worker@project-hu-xiangen.iam.gserviceaccount.com` |
| Cloud Run service | `open-sna-r-worker` |
| Cloud Run revision | `open-sna-r-worker-00001-d76` |
| Traffic | 100% 指向 `open-sna-r-worker-00001-d76` |
| Worker endpoint | `https://open-sna-r-worker-611549608458.asia-east2.run.app` |

已启用部署脚本所需 API：

- `artifactregistry.googleapis.com`
- `cloudbuild.googleapis.com`
- `run.googleapis.com`
- `secretmanager.googleapis.com`

### 4.2 Cloud Run 规格

Cloud Run 实际 describe 输出确认：

| 配置 | 实际值 |
| --- | ---: |
| Execution environment | gen2 |
| CPU | 8 vCPU |
| Memory | 16 GiB |
| Container concurrency | 1 |
| Minimum instances | 0 |
| Maximum instances | 1 |
| Request timeout | 300 秒 |
| Runtime port | 8080 |
| Authentication at application layer | Bearer token from Secret Manager |

服务允许 HTTPS ingress，但分析 route 仍要求匹配的应用层 token；无 token 的请求不会启动 R 作业。

### 4.3 Cloud Build 与镜像

```text
Build ID: b2bd801c-451e-401d-a1c2-c9608cc20e31
Status: SUCCESS
Duration: 28m14s
Image: asia-east2-docker.pkg.dev/project-hu-xiangen/open-sna/open-sna-r-worker:2f1d34f0a7e6
Digest: sha256:75bc7f2ab9420f1793b6d3a67274609fa0bd329b97245d000126cd53db53d6d7
```

最终镜像构建过程内执行了 R preflight，结果为 `Open SNA R preflight PASS`：

| Runtime / package | Version |
| --- | ---: |
| R | 4.4.2 |
| jsonlite | 2.0.0 |
| readxl | 1.4.5 |
| qgraph | 1.9.8 |
| huge | 1.5 |
| mgm | 1.2.15 |
| bootnet | 1.8 |
| networktools | 1.6.0 |
| NetworkComparisonTest | 2.2.3 |

## 5. 验证证据

### 5.1 发布前本地门禁

所有命令均在获授权提交推送前重新执行：

```text
npm test
40 passed, 0 failed

npm run typecheck
PASS

npm run release:hygiene
PASS

npm run open-sna:r-preflight
PASS

npm run build -- --webpack
Compiled successfully
237 static pages generated
```

### 5.2 worker 鉴权边界

无认证请求：

```text
POST Cloud Run /api/open-sna/analyze
HTTP 401
code: WORKER_UNAUTHORIZED
```

这确认了公共 Cloud Run URL 不能被匿名用于执行 R 作业。

### 5.3 Cloud Run 认证 XLSX 验收

测试文件：`open-sna-production-synthetic.xlsx`

- 合法 Microsoft Excel 2007+ 容器；ZIP 完整性通过。
- 6,847 bytes。
- 80 行合成 Likert 数据；6 个题项：`Res1`–`Res3`、`Cop1`–`Cop3`。
- `Gender` 为两个合成组，各 40 行。
- 不包含姓名、邮箱、学号、真实研究样本或其他个人数据。

认证直连结果：

```text
HTTP 200
Elapsed: 24.811493 seconds
Response: 8,958 bytes
Bootstrap replicates: 100
NCT permutations: 1,000
Analyzed rows: 80
Nodes: 6
Nonzero edges: 12
```

### 5.4 `www.sna.hk` API 闭环

同一 XLSX 直接提交到生产 Web adapter：

```text
POST https://www.sna.hk/api/open-sna/analyze
HTTP 200
Elapsed: 24.772604 seconds
Response: 8,958 bytes
Data source: uploaded-workbook
Schema: 1.0
R version: 4.4.2
```

结果包含：

- 80 analyzed rows；
- 6 nodes、12 nonzero edges；
- density 0.800；
- 10 positive edges、2 negative edges；
- subgroup comparison 可用，1,000 permutations；
- stability 可用；
- 所有固定 R 包版本与构建时预检一致。

### 5.5 生产浏览器 UI 闭环

实际操作路径：

1. 打开 `https://www.sna.hk/en/open-sna`。
2. 通过页面可见的 `Choose file` 控件选择合成 XLSX。
3. 页面显示文件名、`0.01 MiB · ready to validate`，运行按钮启用。
4. 保留默认 `1,000 - recommended result`。
5. 点击 `Run R + LUNA analysis`。
6. 页面进入 `Analysis running`，并显示 Validate、Estimate、Compare、Stabilize、Interpret 序列。
7. 约 82 秒后显示：

```text
Ready
Workbook analysis complete.
LUNA was unavailable, so the deterministic R interpretation is shown.
Temporary source data was removed.
```

8. 数据源从 `Aggregate reference` 切换为 `Uploaded workbook`。
9. 汇总显示 `80 responses · 6 nodes · 12 nonzero edges`。

八个结果面板逐项验收：

| # | 面板 | 生产证据 | 结果 |
| ---: | --- | --- | --- |
| 1 | Data Overview | 80 responses；6 nodes；12/15 edges；density 0.800 | PASS |
| 2 | Network Visualization | 可视网络 figure；12 of 12 edges；节点与社区筛选控件 | PASS |
| 3 | Centrality Analysis | 6/6 nodes 的 ordinary centrality table | PASS |
| 4 | Bridge Node Analysis | 6/6 nodes；Cop1 为最高 bridge-strength node；包含稳定性限制 | PASS |
| 5 | Predictability Analysis | 6 个节点 R-squared；mean 0.498 | PASS |
| 6 | Subgroup Comparison (NCT) | Group 1/2 各 n=40；global strength 与 structure p 值；1,000 permutations | PASS |
| 7 | Stability Analysis | strength/bridge CS；明确 `1,000 case-dropping bootstrap samples` | PASS |
| 8 | AI Interpretation | LUNA 未配置时显示 evidence-bounded deterministic R fallback | PASS |

浏览器日志汇总：

```text
Page-origin console errors: 0
Page-origin console logs: 0
Observed logs: browser-extension origin only
```

## 6. 隐私与安全验收

生产 JSON 明确返回：

```text
rawRowsIncluded: false
uploadedWorkbookRetainedByEngine: false
thirdPartyAiUsed: false
```

同时确认：

- 浏览器结果只包含聚合统计，不包含上传工作簿的原始行。
- Cloud Run worker 使用 Secret Manager 注入 token，token 未进入 Git、Markdown、截图或命令输出。
- Vercel 将 URL 与 token 均显示为 Encrypted production variables。
- LUNA 未配置时不会发送任何行级数据给第三方 AI，而是显示确定性的 R evidence summary。
- 临时请求目录在分析结束后清理；UI 也明确显示 `Temporary source data was removed`。

## 7. 当前能力边界与运维注意事项

以下项目不是本次核心闭环失败，但应作为生产运维边界持续关注：

- Cloud Run 目前为 `min instances = 0`，冷启动会增加首次请求延迟。
- `max instances = 1` 与 `concurrency = 1` 是获授权的成本和统计运行完整性限制；同时请求可能等待或收到受控繁忙响应。
- Web adapter 的请求预算为 255 秒，Cloud Run timeout 为 300 秒；比本次 82 秒验收有余量，但更大的 40-node/高样本工作簿仍应单独做容量基准。
- LUNA 目前未配置；AI Interpretation 面板按设计使用确定性的 R fallback。这不影响 XLSX、R 网络估计、NCT、稳定性或八面板结果闭环。
- 生产费用由 Cloud Build、Artifact Registry、Secret Manager 和 Cloud Run 实际使用量决定，应配置预算告警与基本监控。

## 8. 发布后检查清单

- [x] 精确提交推送到 `origin/main`。
- [x] Vercel Git-triggered production deployment READY。
- [x] 在 `project-hu-xiangen` 启用所需 Google Cloud APIs。
- [x] 创建 Artifact Registry repository。
- [x] Cloud Build 成功构建并推送 worker 镜像。
- [x] 镜像内 R preflight PASS。
- [x] 创建 Secret Manager secret 与专用 service account。
- [x] 部署 Cloud Run revision，规格为 8 vCPU/16 GiB/concurrency 1/max 1/300 秒。
- [x] 无认证 worker 请求返回 401。
- [x] 认证 worker XLSX 请求返回 200。
- [x] Vercel production URL/token 变量均为 Encrypted。
- [x] Vercel redeploy READY，生产域名别名生效。
- [x] `www.sna.hk` API XLSX 请求返回 200。
- [x] 生产 UI 完成 1,000 bootstrap + 1,000 NCT permutation。
- [x] 八个上传结果面板均可查看且内容非空。
- [x] 无页面自身 console error。
- [x] 响应不含原始行，worker 不保留上传工作簿。

## 9. 文件与工作区说明

发布提交中的核心路径包括：

- `.dockerignore`
- `.env.example`
- `Dockerfile.open-sna-worker`
- `cloudbuild.open-sna-worker.yaml`
- `app/api/open-sna/analyze/route.ts`
- `next.config.mjs`
- `analysis/open-sna/README.md`
- `analysis/open-sna/WORKER_DEPLOYMENT.md`
- `analysis/open-sna/renv.lock`
- `scripts/deploy-open-sna-worker-cloud-run.sh`
- `tests/open-sna-route.test.ts`
- `tests/open-sna.test.ts`
- `tests/fixtures/fake-open-sna-rscript.mjs`

本生产验收报告在发布完成后于本地新增，因此不属于已获授权并推送的精确提交 `2f1d34f0a7e6292cd50dc0b3b65b276c5694f530`。没有擅自创建或推送额外提交。用户原有未跟踪文件 `OPEN_SNA_FUNCTIONAL_QA_REPORT_2026-08-22.md` 保持未修改、未暂存、未提交。

## 10. 最终判定

| 验收层级 | 状态 |
| --- | --- |
| 源码与自动化测试 | PASS |
| R runtime 与包版本 | PASS |
| Linux 容器构建 | PASS |
| Cloud Run worker | READY / PASS |
| Vercel production | READY / PASS |
| 生产 API XLSX 闭环 | PASS |
| 生产浏览器 XLSX 闭环 | PASS |
| 八个结果面板 | PASS |
| aggregate-only 隐私边界 | PASS |

**最终结论：核心问题已修复，Open SNA 生产环境现已能够完成 XLSX 上传、R 分析与结果查看闭环。**
