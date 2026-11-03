# 🌤️ 心情天气 v0.2.0｜iPhone PWA

私人治愈系像素心情日记。**不需要重新安装主屏幕 App**，只更新现有 GitHub Pages 仓库里的程序文件即可。

## 本版重点

- 16 种天气、选填标签、文字记录、日历、周/月本地统计。
- 岛屿初始空旷；每个有记录的日期最多长出 **1** 处长期景观，同一天多条记录全部保留。
- 岛屿天气动态变化，新增景观按「种子 → 嫩芽 → 成株」生长；「看小岛长大」回放已有风景；点击植物查看当时的心情。
- 每一次新增、编辑、删除都会改变**数据修订号**，确保编辑和删除后也知道要备份。
- JSON 备份 SHA-256 检查、历史 v0.1.1/v0.1.2 备份兼容、恢复前预览与保护副本。
- 最新 iPhone 像素图标保留，离线 Service Worker 更新缓存。

> 本版的天气、植物与动画由程序绘制，没有外链素材，也没有服务器传输私人日记。AI 总结、宠物、群岛、鼓励角色与出气屋还未开发。

## ✅ 更新你现有的 GitHub Pages（最重要）

1. **先在旧版 App 的「设置与备份」导出完整 JSON 文件**，使用「文件」App 把文件保存到 iCloud Drive，并打开「文件」确认文件真的存在。备份文件是明文日记，切勿上传到公开 GitHub 仓库。
2. 从发布 ZIP 解压后，看到 `index.html`、`app.js`、`styles.css`、`sw.js`、`manifest.webmanifest`、`icons/` 等文件；**请只上传解压后里面的内容，不能再套一层文件夹**。
3. 打开你原来的仓库 `https://github.com/yuxiangrosy/heart-weather/upload/main`，在仓库根目录上传这些文件和文件夹，确认覆盖旧文件，提交 `Commit changes`。不要修改 GitHub Pages 站点地址、仓库名。
4. 继续从**iPhone 上原来已安装的那个心情天气桌面图标**打开，连接网络后关闭并再次打开以更新资源。**不要删 App，不要重新添加到主屏幕。**
5. 在 App 里查看旧日历是否仍有记录；检查天气岛、生长动画和备份界面。先不要清理 Safari 网站数据。
6. 首次更新后如果还显示旧版本，可稍后联网关闭、重开一次，让新的 Service Worker 接管。不要通过卸载来“强制刷新”。

项目路径示例（文件直接在仓库根目录）：

```text
heart-weather/
├── index.html
├── app.js
├── styles.css
├── sw.js
├── manifest.webmanifest
├── icons/
│   ├── icon-192-mood-v2.png
│   ├── icon-512-mood-v2.png
│   └── apple-touch-icon-mood-v2.png
├── README.md
├── CHANGELOG.md
└── tests/
```

GitHub Pages 地址：`https://yuxiangrosy.github.io/heart-weather/`

## 本地数据和备份

- 数据库：`heart-weather-db`，IndexedDB **版本 1**，原表 `moods`、`growth`、`meta`、`drafts` 均不变。
- 备份格式：`mood-weather-backup` / **schemaVersion 1**，与旧版本相同；`settings` 新增可选修订号字段，不影响旧备份导入。
- 数据每次记录提交后保存在本机，**不等于 iCloud 自动备份**。
- 在设置中点击「创建完整备份文件（JSON）」后，还需在文件 App 确认保存，再点「我已确认备份存在」。导出后如果发生过新增、编辑、删除，需重新导出才可确认最新版。
- 恢复备份会全量替换当前数据。恢复前必须保护当前数据，不支持自动合并。
- 同一个站点在 Safari 和不同主屏幕安装实例中可能有不同的本地数据库，**不要反复新建图标**。

## 运行与测试

项目目前使用原生 HTML + CSS + JavaScript，可直接用 Python 提供本地服务：

```bash
python3 -m http.server 4173
```

浏览器打开 `http://localhost:4173/`。`tests/test_v020_mock.py` 已在本环境通过 Chromium + 模拟 IndexedDB 的交互回归。`tests/test_v020_real.py` 是可在支持本地 HTTP 的电脑上运行的真实 IndexedDB / Service Worker 测试；如果另行提供旧版解压目录，并设置 `HEART_WEATHER_V012_DIR` 环境变量，还会执行升级兼容测试；本次运行环境阻止 Chromium 访问本地网址，因此**该真实测试尚未跑通**。这两类测试都不能代替你在 iPhone Safari 上的实测。

## 仍需 iPhone 实测的项目

- [ ] 关闭网络后冷启动 App 并新增记录，联网后原数据仍在
- [ ] 新旧版本 GitHub 更新前后心情和小岛状态不丢失
- [ ] 用「文件」App 存储备份至 iCloud Drive，并从文件中恢复测试数据
- [ ] 降低动态效果时植物无动态跳动、按钮仍可用
- [ ] 多次打开关闭后无明显耗电或卡顿

## 注意事项

明文备份里会包含你的心情文字；GitHub Pages 只能用于托管 App 代码，**不要提交日记备份**。如果换域名、删除已安装的独立 PWA 或清理网站数据，都可能丢失该安装实例里的记录。尽量每周导出独立备份。
