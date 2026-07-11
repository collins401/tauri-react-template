# Tauri Updater 更新服务端配置指南

## 更新流程

```
App 启动 → check() 请求更新端点 → 比较版本号 → 有更新？
  ├─ 无更新 → 返回 null，流程结束
  └─ 有更新 → download() 下载安装包 → install() 安装 → relaunch() 重启
```

## 1. 服务端端点

在 `tauri.conf.json` 的 `plugins.updater.endpoints` 中配置更新检查 URL：

```json
{
  "plugins": {
    "updater": {
      "endpoints": [
        "https://your-server.com/api/update/{{target}}/{{current_version}}"
      ],
      "pubkey": ""
    }
  }
}
```

路由参数（可选）：

| 参数 | 说明 | 示例 |
|------|------|------|
| `{{target}}` | 目标平台架构 | `darwin-aarch64`, `windows-x86_64`, `linux-x86_64` |
| `{{current_version}}` | 当前应用版本 | `0.1.0` |
| `{{arch}}` | CPU 架构 | `x86_64`, `aarch64` |

不使用参数也可以，用固定端点：
```json
"endpoints": ["https://your-server.com/update.json"]
```

可配置多个端点作为 fallback：
```json
"endpoints": [
  "https://cdn1.example.com/update.json",
  "https://cdn2.example.com/update.json"
]
```

## 2. 端点返回格式

更新端点需返回如下 JSON：

```json
{
  "version": "1.0.0",
  "notes": "Release notes here...",
  "pub_date": "2026-07-08T12:00:00Z",
  "platforms": {
    "darwin-aarch64": {
      "signature": "",
      "url": "https://your-server.com/releases/v1.0.0/tauri-app_aarch64.app.tar.gz"
    },
    "darwin-x86_64": {
      "signature": "",
      "url": "https://your-server.com/releases/v1.0.0/tauri-app_x86_64.app.tar.gz"
    },
    "linux-x86_64": {
      "signature": "",
      "url": "https://your-server.com/releases/v1.0.0/tauri-app_amd64.AppImage.tar.gz"
    },
    "windows-x86_64": {
      "signature": "",
      "url": "https://your-server.com/releases/v1.0.0/tauri-app_x64-setup.nsis.zip"
    },
    "windows-i686": {
      "signature": "",
      "url": "https://your-server.com/releases/v1.0.0/tauri-app_x86-setup.nsis.zip"
    }
  }
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `version` | string | 是 | 新版本号，需符合 semver 格式 |
| `notes` | string | 否 | 更新说明，支持纯文本 |
| `pub_date` | string | 否 | 发布日期，ISO 8601 格式 |
| `platforms` | object | 是 | 各平台的下载信息 |

### platforms 平台标识

`tauri build` 编译后的产物文件名会包含目标三元组，对应关系如下：

| 平台 | 目标三元组 |
|------|-----------|
| macOS Apple Silicon | `darwin-aarch64` |
| macOS Intel | `darwin-x86_64` |
| Windows 64-bit | `windows-x86_64` |
| Windows 32-bit | `windows-i686` |
| Windows ARM64 | `windows-aarch64` |
| Linux 64-bit | `linux-x86_64` |
| Linux ARM64 | `linux-aarch64` |

## 3. 签名验证（可选）

### 生成密钥对

```bash
# 安装 minisign（如果未安装）
brew install minisign        # macOS
# 或 cargo install minisign   # 通过 Cargo

# 生成密钥对
minisign -G
```

生成两个文件：
- `minisign.pub` — 公钥，填入 `tauri.conf.json` 的 `pubkey` 字段
- `~/.minisign/minisign.key` — 私钥，用于签名

### 签署安装包

```bash
minisign -S -s ~/.minisign/minisign.key -m your-app.tar.gz
```

生成的签名字符串填入对应平台的 `signature` 字段：

```json
"darwin-aarch64": {
  "signature": "untrusted comment: signature from minisign secret key\nRWQq...base64...",
  "url": "https://..."
}
```

### 不启用签名

如果暂时不使用签名验证，保持以下配置即可：

- `tauri.conf.json` 中 `pubkey` 设为 `""`（空字符串）
- 端点返回的 JSON 中 `signature` 设为 `""`（空字符串）

## 4. 服务端实现示例

### 静态 JSON 文件（最简单）

将 `update.json` 部署到静态文件服务器：

```
https://your-server.com/update.json
```

Nginx 配置：
```nginx
location /update.json {
    add_header Access-Control-Allow-Origin "*";
    add_header Cache-Control "no-cache";
}
```

### Node.js / Express

```js
app.get('/api/update/:target/:current_version', (req, res) => {
  const { target, current_version } = req.params;
  const latest = "1.0.0";

  // 版本比较：当前版本低于最新版本才返回更新
  if (semver.lt(current_version, latest)) {
    res.json({
      version: latest,
      notes: "新版本发布：修复了若干 Bug，提升了性能。",
      pub_date: "2026-07-08T12:00:00Z",
      platforms: {
        [target]: {
          signature: "",
          url: `https://cdn.example.com/releases/${latest}/${target}.tar.gz`
        }
      }
    });
  } else {
    // 返回 204 或无 platforms 字段表示无更新
    res.status(204).send();
  }
});
```

### Cloudflare Workers

```js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = url.searchParams.get('target') || 'darwin-aarch64';
    const currentVersion = url.searchParams.get('version') || '0.0.0';

    const releases = {
      '1.0.0': {
        version: '1.0.0',
        notes: 'Initial release',
        pub_date: '2026-07-08T12:00:00Z',
        platforms: {
          'darwin-aarch64': {
            signature: '',
            url: 'https://releases.example.com/1.0.0/darwin-aarch64.tar.gz'
          }
        }
      }
    };

    const latest = releases['1.0.0'];
    if (currentVersion < latest.version) {
      return Response.json(latest);
    }
    return new Response(null, { status: 204 });
  }
};
```

## 5. 构建产物与分发

### 编译各平台安装包

```bash
# macOS
tauri build --target aarch64-apple-darwin
tauri build --target x86_64-apple-darwin

# Windows（需交叉编译或在 Windows 上构建）
tauri build --target x86_64-pc-windows-msvc

# Linux
tauri build --target x86_64-unknown-linux-gnu
```

产物在 `src-tauri/target/<target>/release/bundle/` 目录下：

| 平台 | 产物格式 |
|------|---------|
| macOS | `.app.tar.gz` |
| Windows | `.msi` 或 `.nsis.zip` |
| Linux | `.AppImage.tar.gz` 或 `.deb` |

### 上传到服务器

将编译产物上传到 CDN/服务器，然后在 `update.json` 中填写对应的下载 URL。

## 6. 调试

开发模式下会自动允许 HTTP 端点（生产环境强制要求 HTTPS）。

如需在生产环境使用 HTTP，需在 `tauri.conf.json` 中显式允许：

```json
"plugins": {
  "updater": {
    "endpoints": ["http://your-server.com/update.json"],
    "dangerousInsecureTransportProtocol": true
  }
}
```

客户端调用示例：
```typescript
import { check } from '@tauri-apps/plugin-updater';

const update = await check();
if (update) {
  console.log(`New version: ${update.version}`);
  console.log(`Release notes: ${update.body}`);
  await update.downloadAndInstall();
}
```

每次发布都需要对新包签名
```bash
minisign -S -s minisign.key -m darwin-aarch64.app.tar.gz -x darwin-aarch64.app.tar.gz.minisig
```