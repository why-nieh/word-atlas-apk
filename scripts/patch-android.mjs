#!/usr/bin/env node
/**
 * 给 Capacitor 生成的 android 工程打补丁。
 *
 * 解决三件事：
 * 1. assets 里的 mp3 / webp / json 不再二次压缩（本来就压不动，且不压缩才能 openFd + seek）
 * 2. Gradle 打包 650MB、3 万条目时内存不够，抬高 JVM 堆
 * 3. lint 不要在出包最后一步拦路
 *
 * 用法：node scripts/patch-android.mjs app/android
 */
import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] || "app/android";
const appGradle = path.join(root, "app", "build.gradle");
const gradleProps = path.join(root, "gradle.properties");
const assetsDir = path.join(root, "app", "src", "main", "assets", "public");

const log = (s) => console.log(`[patch] ${s}`);

if (!fs.existsSync(appGradle)) {
  console.error(`[patch] 找不到 ${appGradle}，cap add android 可能失败了`);
  process.exit(1);
}

/* ---------- 1. app/build.gradle ---------- */
let gradle = fs.readFileSync(appGradle, "utf8");

if (!gradle.includes("// word-atlas-patch")) {
  gradle += `

// word-atlas-patch
android {
    androidResources {
        noCompress += ['mp3', 'webp', 'json', 'woff2', 'ttf', 'otf']
    }
    lint {
        abortOnError false
        checkReleaseBuilds false
    }
}
`;
  fs.writeFileSync(appGradle, gradle);
  log("build.gradle 已注入 noCompress / lint / packaging");
} else {
  log("build.gradle 已有补丁，跳过");
}

/* ---------- 2. gradle.properties ---------- */
let props = fs.existsSync(gradleProps) ? fs.readFileSync(gradleProps, "utf8") : "";
const jvmLine = "org.gradle.jvmargs=-Xmx6144m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8";
if (/^org\.gradle\.jvmargs=.*$/m.test(props)) {
  props = props.replace(/^org\.gradle\.jvmargs=.*$/m, jvmLine);
} else {
  props += `\n${jvmLine}\n`;
}
if (!props.includes("org.gradle.parallel")) props += "org.gradle.parallel=true\n";
if (!props.includes("org.gradle.caching")) props += "org.gradle.caching=true\n";
fs.writeFileSync(gradleProps, props.trimEnd() + "\n");
log("gradle.properties 堆内存调到 6g");

/* ---------- 3. 体检：assets 到底拷进来没有 ---------- */
if (fs.existsSync(assetsDir)) {
  let files = 0;
  let bytes = 0;
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else {
        files += 1;
        bytes += fs.statSync(p).size;
      }
    }
  };
  walk(assetsDir);
  log(`assets/public 共 ${files} 个文件，${(bytes / 1024 / 1024).toFixed(0)} MB`);
  if (files < 1000) {
    console.error("[patch] assets 文件数偏少，dist 没拷全，出包也没有离线素材，中止");
    process.exit(1);
  }
} else {
  console.error(`[patch] 找不到 ${assetsDir}，APK 里会没有离线素材，中止`);
  process.exit(1);
}
