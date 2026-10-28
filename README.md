# 哪吒学汉字 · 安卓离线套壳

把开源项目 [dhjz/hanzi-study](https://github.com/dhjz/hanzi-study)（哪吒学汉字）打包成**完全离线**的安卓 APK，针对 **4 岁中班**孩子做了适配。

上游是纯静态站点（Vue 3 + hanzi-writer，无后端），整个站点 25 MB 已完整放入 `web/`，APK 约 28 MB，装完不联网也能用。

## 包里有什么

| 模块 | 内容 | 4 岁适配说明 |
| :--- | :--- | :--- |
| 学汉字 | 1303 字，按难度递进：一二三四十口日月… | 前 120 字全是基础字；每字带拼音、词、例句、笔画动画、听音辨字、贴纸画 |
| 学数学 | 10/99 以内加减 | **已把默认改成 10 以内**（十法），自带数字键盘，不弹系统输入法 |
| 学古诗词 | 114 首课本古诗，全部配朗读音频 | 第一组就是咏鹅、静夜思、悯农、江南，能听能跟读 |

## 针对 4 岁做的改动（相对上游）

见 `scripts/patch-web.mjs`，全部幂等：

1. **数学默认十法**——上游默认 100 以内，4 岁直接劝退
2. **老 WebView 兼容**——所有 `100dvh` 前置 `100vh` 兜底（Android 7/8 旧 WebView 不认识 dvh，整条声明会被忽略导致布局塌陷）
3. **返回键接管**——数学/古诗页按返回回主界面，主界面再按一次才退出，防孩子误触直接杀掉 App
4. **TTS 体检**——点字读音走系统语音合成，若本机没有中文 TTS 引擎（部分国产 ROM 的 WebView 会静音），连续 3 次失败后顶部弹一条给家长看的提示，不用 alert 吓孩子

## 出包

本地不用装任何安卓工具链，全在 GitHub Actions：

1. GitHub 建 **public** 仓库，推这个目录
2. Actions → Build offline APK → Run workflow（push 到 main 也会自动触发）
3. 约 5 分钟，Releases 页面出现 `nezha-hanzi-v1.0.N.apk`，手机直接下载安装

## 已构建产物

- **v1.0.3**：`nezha-hanzi-v1.0.3.apk`，26.77 MB
- 下载页：`https://github.com/why-nieh/hanzi-study-apk/releases/latest`
- 国内直连加速：`https://gh-proxy.com/https://github.com/why-nieh/hanzi-study-apk/releases/download/v1.0.3/nezha-hanzi-v1.0.3.apk`
- 包内已核验（Range 解析中央目录）：676 条目，学汉字/数学/古诗全部素材在 `assets/public/`，130 个 mp3 全部未压缩存储（音频可随机 seek），全部断网可用
- 首次构建踩坑记录：AGP 8 下 `aaptOptions`/`androidResources` 顶层块不可用，noCompress 必须追加进模板自带的 `defaultConfig > aaptOptions`；补丁注入不能按 `lastIndexOf("}")` 定位（会落进文件末尾 try/catch）

## 家长须知

- **进度强制顺序解锁**：每个字做完「画一画吧」（点对 10 次）才解锁下一个，每 6 个字一次听音辨字测验。孩子卡住了：**连点标题「哪吒学汉字」10 次**，输入关卡号即可跳关。
- **进度存本机**（localStorage）：卸载 App 即清空，换机不迁移。
- **书写笔画（🖋️）步骤对 4 岁偏早**：它不进解锁链，孩子玩不了可以不管，不影响学新字。
- 点字读音依赖系统 TTS。装好后先点一个字试试有没有声音；没声音的话去系统设置里启用中文语音引擎（华为：小艺语音；或装"讯飞语记"），还不行来找我加原生 TTS 插件。

## 本地开发（可选）

```bash
npm install
node scripts/patch-web.mjs     # 前端适配补丁
npx cap add android            # 首次生成 android 工程
npx cap sync android           # web/ 同步进 assets
node scripts/patch-android.mjs android
cd android && ./gradlew assembleDebug
```

## 授权与署名

- 上游代码与内容：MIT License，此处按其要求保留原仓库署名
- 本仓库的构建脚本与适配补丁：MIT
- `appimg/` 与形象图仅用于上游应用自身展示，勿单独用于商业用途
