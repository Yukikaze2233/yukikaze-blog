# Yukikaze Blog

原生 HTML + CSS + JavaScript 构建的个人博客。视觉与交互风格延续自个人主页（Yukikaze2233/homepage），文章使用 Markdown 编写，浏览器端渲染。

## 本地预览

```bash
cd /home/yukikaze/Documents/workspace/yukikaze-blog
python3 -m http.server 8000
```

浏览器打开 <http://127.0.0.1:8000/>。

## 写文章

1. 在 `posts/` 下新建 `文章名.md`，顶部 front matter：

```markdown
---
title: 文章标题
date: 2026-08-29
excerpt: 一句话摘要
tags: [RoboMaster, C++]
---
```

2. 重新生成索引：

```bash
python3 scripts/build_posts_index.py
```

3. 提交并推送。首页文章列表会自动读取 `posts/index.json`。

> 小技巧：也可以直接用
>
> ```bash
> python3 scripts/new_post.py "文章标题" --tags "RoboMaster, C++"
> ```
>
> 它会自动生成草稿并刷新索引。

## 网页管理后台

打开 <http://127.0.0.1:8000/admin.html>：

1. 到 GitHub 创建一个带 `repo` 权限的 Personal Access Token（页面里有入口）。
2. 粘贴保存。Token 只存在浏览器 localStorage，不写入仓库。
3. 之后即可在网页中新建 / 编辑 / 删除 `posts/` 下的文章。

GitHub Actions 也会在 `posts/**.md` 推送时自动重建 `posts/index.json`，所以在 GitHub 网页端直接新建或修改 Markdown 文章同样会生效。

## 目录结构

```text
index.html              首页（文章列表 / 精选项目 / 关于）
post.html               文章详情页
posts/                  Markdown 文章 + index.json 索引
scripts/                索引生成脚本
static/
  css/style.css
  js/script.js
  js/admin.js        管理后台逻辑
  img/                  头像、背景、favicon
  vendor/               markdown-it / highlight.js / KaTeX（本地化）
```

## 部署

纯静态站点，可直接部署到 GitHub Pages / Cloudflare Pages。

- 构建命令：无
- 输出目录：`/`

## 技术栈

- Markdown 渲染：markdown-it
- 代码高亮：highlight.js
- 数学公式：KaTeX
- 阅读进度条、文章列表：原生 JS
- 网页管理：GitHub Contents API（无自建后端）
