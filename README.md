# 晨晨的七夕花园

送给付晨（晨晨）的七夕互动页面：3D 玫瑰开场、Canvas 烟花与心形粒子、滚动驱动的 3D 环形相册、灯箱和三击彩蛋。页面使用 React 19、Vinext、Vite 与原生 CSS/Canvas，兼容桌面端、手机端和微信内置浏览器。

## 本地预览

项目要求 Node.js 22.13 或更高版本。依赖已安装时直接运行：

```bash
npm run dev
```

访问 <http://localhost:3007>。开发服务绑定 `0.0.0.0`，同一局域网内的手机也可通过电脑 IP 和 `3007` 端口预览。

## 更新照片

本地照片默认从 `/Users/litao/Downloads/七夕快乐` 读取：

```bash
npm run photos:sync
```

也可以传入另一个文件夹：

```bash
npm run photos:sync -- /绝对路径/照片文件夹
```

同步脚本会：

- 读取 JPG、JPEG、PNG、HEIC 和 HEIF；
- 按照片创建时间（缺失时使用修改时间）排序；
- 使用 macOS 自带的 `sips` 转换为 JPG；
- 将最长边限制为 1800px，JPEG 质量设为 78；
- 原子替换 `public/photos`，依次输出 `01.jpg`、`02.jpg`……；
- 自动生成 `app/photo-manifest.json`，页面不写死照片数量。

该同步步骤只在 macOS 本地运行。生成后的 JPG 和清单会进入代码仓库，GitHub Actions 不需要访问本机照片目录。

## 验证

```bash
npm run build
npm run build:pages
npm run check:pages
```

`check:pages` 会执行 Pages 专用类型检查、ESLint、静态构建和资源一致性测试。

本地开发服务运行时，还可使用已安装的 Google Chrome 执行移动端浏览器冒烟测试：

```bash
npm run test:browser
```

该测试会模拟 375px 微信浏览器视口，并验证无横向溢出、滚动进度、照片切换、灯箱和三击彩蛋。

## GitHub Pages

`.github/workflows/deploy-pages.yml` 在 `main` 分支有新提交时自动构建并发布 `pages-dist`。自定义域名由 `public/CNAME` 保留为：

```text
chen.litao.ink
```

DNS 需配置 CNAME 指向 `lancewalker91.github.io`。GitHub Pages 的 HTTPS 强制设置属于仓库后台配置，不由此代码仓库控制。

当前协作约定：本地修改完成后先通过 `http://localhost:3007` 预览；只有在明确收到“更新到服务器”指令后，才提交并推送到 `main`。
