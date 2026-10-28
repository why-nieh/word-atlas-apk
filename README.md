# 词光 · 完全离线安卓套壳

把 [word-atlas](https://github.com/designfuchen/word-atlas)（React + Vite 纯前端应用）用 Capacitor 包成原生 APK，**7298 幅插画、22905 段录音、词库数据全部打进包里，装到手机上断网可用**。

本仓库不含上游代码和素材，构建时才从上游拉取——所以它只有几十 KB。

## 已经出来的包

**v1.0.3 · 646.7 MB** —— 已构建并发布，手机浏览器直接点：

- 发布页：https://github.com/why-nieh/word-atlas-apk/releases/latest
- 直链：https://github.com/why-nieh/word-atlas-apk/releases/download/v1.0.3/word-atlas-offline-v1.0.3.apk
- 国内镜像（直链打不开时用这个）：https://gh-proxy.com/https://github.com/why-nieh/word-atlas-apk/releases/download/v1.0.3/word-atlas-offline-v1.0.3.apk

包内实测构成（38,080 个条目）：

| 内容 | 数量 | 体积 |
| :--- | ---: | ---: |
| 例句 / 单词录音 | 22,905 段 | 366 MB |
| 插画（512px webp） | 7,298 张 | 185 MB |
| 缩略图 | 7,298 张 | 70 MB |
| 词库索引 + 66 个分块 | 67 个 | 7 MB |
| 代码、字体、图标、界面音效 | — | 19 MB |

所有资源都是**未压缩存储**（`noCompress`），音频才能随机 seek、拖进度条。

## 怎么出包

1. 在 GitHub 新建一个仓库（**必须 public**，否则 Actions 消耗私有额度），把本目录推上去：

   ```bash
   cd word-atlas-android
   git init && git add -A && git commit -m "init"
   git remote add origin git@github.com:<你的账号>/word-atlas-apk.git
   git push -u origin main
   ```

2. 打开仓库的 **Actions → Build offline APK → Run workflow**。

3. 等 **4 分钟左右**（实测 3–4 分钟）。构建成功会自动发一个 Release，页面见上；也可以从本次运行页面底部的 **Artifacts** 下载。

4. 手机安装：允许「安装未知来源应用」后直接点开 apk。

> 首次构建慢在 Gradle 下载依赖和打包 650MB assets；之后重跑会快一些。

## 构建流程里发生了什么

```
上游 clone → npm ci → npm run build（出 650MB 的 dist）
  → 删掉 sw.js → cap add android（dist 整包拷进 assets/public）
  → 打补丁（noCompress / 堆内存 / lint 放行）→ gradlew assembleDebug
```

补丁做了三件事，缺一件就会翻车：

| 补丁 | 为什么 |
| :--- | :--- |
| `noCompress mp3/webp/json` | 这些格式本来就压不动；不压缩才能 `openFd` 随机读，音频拖动进度条才正常 |
| `-Xmx6144m` | 3 万个 assets 条目打包，默认 1.5G 堆会直接 OOM |
| `lint.abortOnError false` | 不让 lint 在出包最后一步拦路 |

## 已知限制

- **约 650MB**，安装后占 1.2GB 左右。全量离线是这个代价，砍不掉。
- **没有后台播放**。息屏后发音会停——纯套壳拿不到 Android 的 MediaSession，要做得自己写原生前台服务。
- **卸载 App 会清空学习进度**。进度在 WebView 的 localStorage 里，记得用 app 内的「导出进度」备份。
- **星图是 WebGL2**，老机器可能掉帧，作者有降级方案，但低端机上体验一般。
- 首次进「词库」页要解析 7MB 的 index.json，会有短暂卡顿。

## 改名字 / 换图标

- 应用名和包名：改 `capacitor.config.json` 的 `appName`、`appId`（`appId` 决定安装后是否和别的版本冲突）。
- 图标：出包后替换 `app/android/app/src/main/res/mipmap-*`，或者在 CI 里加一步 `npx @capacitor/assets generate`（需要一张 1024×1024 的 png）。

## 本地构建（这台机器不行）

本机是 aarch64 麒麟，官方 Android SDK 命令行工具和 aapt2 只发 x86_64 包，硬装要自己编 aapt2，不值得。本地构建需要：

```bash
# x86_64 Linux / macOS 上
export ANDROID_HOME=~/Android/Sdk
git clone --depth 1 https://github.com/designfuchen/word-atlas.git app
cd app && npm ci && npm run build
npm i -D @capacitor/cli@^7 && npm i @capacitor/core@^7 @capacitor/android@^7
cp ../capacitor.config.json . && rm -f dist/sw.js && npx cap add android
cd .. && node scripts/patch-android.mjs app/android
cd app/android && ./gradlew assembleDebug
```

## 授权提醒

- 代码 MIT；词库、插画、录音 CC BY 4.0，**再分发必须署名** `Word Atlas contributors（词光）` 并注明修改。
- `public/sfx/` 里的界面音效和配乐**不在** CC BY 4.0 范围内（README 只写「随应用一起提供」）。自己用没事；要公开发布，先删掉这个目录再把 `dist` 打进包。
- 上架国内应用商店还需要软件著作权 + APP 备案，侧载安装不需要。
