# 蓝湖图片上传工作台

将“蓝湖下载图片 -> Tinify 压缩 -> 上传华为 OBS -> 复制地址”合并成一个页面操作。

## 功能

- 用户输入目标目录与连接凭据，连接成功后浏览器自动保存凭据。
- 拖拽或批量选择图片，按队列调用 Tinify 压缩后上传 OBS。
- 实时显示压缩前后体积、处理状态、成功动效和 `obs://` 地址。
- 华为 OBS BrowserJS SDK 直接完成目录读取与上传。

## 本地运行

```bash
npm install
npm run dev
```

## 技术栈

React、Tailwind CSS、Motion for React、Huawei Cloud OBS BrowserJS SDK。
