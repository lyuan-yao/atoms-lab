# 部署指南（Render 示例，零依赖 Node 22 应用）

## 1. 代码到 GitHub

```bash
# 本仓库已初始化并提交。添加远端后推送：
git remote add origin git@github.com:<你的用户名>/atoms-lab.git
git push -u origin main
```

推送后把仓库设为 **Public**（Settings → General → Danger Zone → Change visibility）。

## 2. Render 部署（免费、无需信用卡）

1. 打开 https://render.com → 用 GitHub 登录 → **New + → Web Service**
2. 选择 `atoms-lab` 仓库（如果列表没有，点 "Configure account" 授权）
3. 配置（仓库里的 `render.yaml` 已写好，也可手动填）：
   - Runtime: **Node**
   - Build Command: `echo "zero-dependency, nothing to build"`（留空也可以）
   - Start Command: `node --experimental-sqlite server/index.js`
   - Environment Variable: `NODE_VERSION = 22.13.0`
4. （可选但推荐）配置真实模型，让评审打开就能生成：
   - `ATOMS_LLM_BASE = https://api.deepseek.com/v1`（或任意 OpenAI 兼容接口）
   - `ATOMS_LLM_MODEL = deepseek-chat`
   - `ATOMS_LLM_KEY = sk-xxx`
5. Create Web Service → 等待部署 → 获得 `https://atoms-lab-xxxx.onrender.com`

> 注意：免费实例 15 分钟无访问会休眠，首次唤醒约需 30 秒；重新部署会重置 SQLite（演示数据会清空，属预期）。

## 3. 其他平台

任意支持长驻 Node 进程的平台都可以（Railway / Fly.io / 自有 VPS）：

- 启动命令：`node --experimental-sqlite server/index.js`
- 端口从 `PORT` 环境变量读取
- 模型密钥三个环境变量见上；不配置时应用保持“无密钥不生成”的诚实状态

## 4. 部署后自检

1. 打开首页，注册账号（送 120 积分）
2. 设置页填模型接口 → 点「测试连接」确认耗时
3. 首页输入一句话 → 工作室里看八位角色流式输出 → 预览可点
4. 发一条修改要求 → 看“这次改了 N 处”清单
5. 点预览里的标题 → 「让团队改」→ 验证 AI 改写
6. 发布 → 打开 `/p/...` → 回工作室看「浏览」计数上涨
