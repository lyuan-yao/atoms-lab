# 部署指南（阿里云轻量 / Render / 本地，零依赖 Node 22 应用）

## 0. 阿里云轻量应用服务器（当前线上环境）

```bash
# 1) 服务器：Ubuntu 22.04，安全组/防火墙放行 TCP 22、4173
# 2) 安装 Node 22（国内镜像）
ssh root@<服务器IP>
mkdir -p /usr/local/node22 && cd /tmp
curl -fsSL -o node.tar.xz https://registry.npmmirror.com/-/binary/node/v22.13.0/node-v22.13.0-linux-x64.tar.xz
tar -xJf node.tar.xz -C /usr/local/node22 --strip-components=1 && rm node.tar.xz
ln -sf /usr/local/node22/bin/node /usr/local/bin/node

# 3) 代码（scp 直传或 git clone）
mkdir -p /opt/atoms-lab && tar -xzf app.tgz -C /opt/atoms-lab   # 仓库打包，排除 .git/data

# 4) 密钥放服务器本地（600 权限，不进仓库）
cat > /etc/atoms-lab.env <<'EOF'
PORT=4173
ATOMS_LLM_BASE=https://api.deepseek.com/v1
ATOMS_LLM_MODEL=deepseek-chat
ATOMS_LLM_KEY=sk-xxx
EOF
chmod 600 /etc/atoms-lab.env

# 5) systemd 常驻 + 开机自启 + 崩溃自动拉起
cat > /etc/systemd/system/atoms-lab.service <<'EOF'
[Unit]
Description=Atoms Lab - multi-agent app studio
After=network.target
[Service]
WorkingDirectory=/opt/atoms-lab
EnvironmentFile=/etc/atoms-lab.env
ExecStart=/usr/local/node22/bin/node --experimental-sqlite server/index.js
Restart=always
RestartSec=3
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload && systemctl enable --now atoms-lab
```

> 提示：不要在页面里放任何渲染阻塞的外部资源（如 Google Fonts），国内会被墙拖慢首屏；字体请自托管（仓库 `public/fonts/` 已内置）。

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
