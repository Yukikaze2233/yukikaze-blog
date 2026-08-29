console.log('%cYukikaze Blog', 'color:#747bff;font-size:16px');

// 页面通用：项目卡片按压反馈（与主页交互风格一致）
document.querySelectorAll('.project-card').forEach(function (card) {
    card.addEventListener('mousedown', function () {
        card.style.transform = 'scale(0.98)';
    });
    card.addEventListener('mouseup', function () {
        card.style.transform = '';
    });
    card.addEventListener('mouseleave', function () {
        card.style.transform = '';
    });
});

// 顶部阅读进度条
const progress = document.getElementById('readingProgress');
function updateProgress() {
    if (!progress) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (docHeight > 0 ? (scrollTop / docHeight) * 100 : 0) + '%';
}
window.addEventListener('scroll', updateProgress, { passive: true });
window.addEventListener('resize', updateProgress);
updateProgress();

const isPostPage = document.body.classList.contains('page-post') || document.getElementById('postBody');

if (isPostPage) {
    window.__blog = window.__blog || {};
    window.__blog.page = 'post';
} else {
    window.__blog = window.__blog || {};
    window.__blog.page = 'home';
}

// 生成文章列表并渲染 Markdown
function loadPosts() {
    const postList = document.getElementById('postList');
    if (!postList) return;

    fetch('./posts/index.json')
        .then(function (r) {
            if (!r.ok) throw new Error('posts/index.json ' + r.status);
            return r.json();
        })
        .then(function (posts) {
            const list = posts
                .filter(function (p) { return !p.draft; })
                .sort(function (a, b) { return b.date.localeCompare(a.date); });

            postList.innerHTML = '';

            if (!list.length) {
                postList.innerHTML =
                    '<div class="post-card"><h3>还没有文章</h3><p>等我把第一篇文章写出来。</p></div>';
                return;
            }

            list.forEach(function (p) {
                const a = document.createElement('a');
                a.className = 'post-card';
                a.href = './post.html?slug=' + encodeURIComponent(p.slug);

                const h3 = document.createElement('h3');
                h3.textContent = p.title;

                const excerpt = document.createElement('p');
                excerpt.textContent = p.excerpt || '';

                const meta = document.createElement('div');
                meta.className = 'post-meta';
                meta.textContent = p.date + (p.tags && p.tags.length ? ' · ' + p.tags.join(' / ') : '');

                a.appendChild(h3);
                a.appendChild(excerpt);
                a.appendChild(meta);
                postList.appendChild(a);
            });
        })
        .catch(function (err) {
            console.error('加载文章列表失败', err);
            postList.innerHTML =
                '<div class="post-card"><h3>文章列表加载失败</h3><p>请通过本地 HTTP 服务访问本站。</p></div>';
        });
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDate(date) {
    const d = new Date(date + 'T00:00:00');
    if (isNaN(d.getTime())) return date;
    return date + ' · ' + d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function renderMath(root) {
    if (window.renderMathInElement) {
        try {
            window.renderMathInElement(root, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false }
                ],
                throwOnError: false
            });
        } catch (err) {
            console.error('KaTeX 渲染失败', err);
        }
    }
}

function loadPost() {
    const postBody = document.getElementById('postBody');
    if (!postBody) return;

    const titleEl = document.getElementById('postTitle');
    const metaEl = document.getElementById('postMeta');
    const notFoundEl = document.getElementById('postNotFound');
    const slug = new URLSearchParams(window.location.search).get('slug');

    if (!slug) {
        postBody.hidden = true;
        notFoundEl.hidden = false;
        if (titleEl) titleEl.textContent = '没有指定文章';
        return;
    }

    fetch('./posts/index.json')
        .then(function (r) {
            if (!r.ok) throw new Error('posts/index.json ' + r.status);
            return r.json();
        })
        .then(function (posts) {
            const p = posts.find(function (item) { return item.slug === slug; });
            if (!p) {
                postBody.hidden = true;
                notFoundEl.hidden = false;
                if (titleEl) titleEl.textContent = '文章不存在';
                document.title = '文章不存在 · Yukikaze 的小站';
                return;
            }

            return fetch('./posts/' + p.slug + '.md')
                .then(function (r) {
                    if (!r.ok) throw new Error('文章文件不存在');
                    return r.text();
                })
                .then(function (md) {
                    document.title = p.title + ' · Yukikaze 的小站';
                    if (titleEl) titleEl.textContent = p.title;

                    const mdInstance = window.markdownit({
                        html: false,
                        linkify: true,
                        typographer: false,
                        highlight: function (str, lang) {
                            if (lang && window.hljs && window.hljs.getLanguage(lang)) {
                                try {
                                    return '<pre class="hljs"><code>' +
                                        window.hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
                                        '</code></pre>';
                                } catch (e) {
                                    console.error('高亮失败', e);
                                }
                            }
                            return '<pre class="hljs"><code>' + escapeHtml(str) + '</code></pre>';
                        }
                    });

                    const rendered = mdInstance.render(md);
                    postBody.innerHTML = rendered;
                    renderMath(postBody);

                    if (metaEl) {
                        metaEl.innerHTML =
                            '<time datetime="' + escapeHtml(p.date) + '">' + escapeHtml(formatDate(p.date)) + '</time>' +
                            '<span>' + (p.tags || []).map(escapeHtml).join(' · ') + '</span>';
                    }
                });
        })
        .catch(function (err) {
            console.error('加载文章失败', err);
            postBody.innerHTML =
                '<div class="post-card"><h3>文章加载失败</h3><p>请通过本地 HTTP 服务访问本站。</p></div>';
        });
}

if (isPostPage) {
    loadPost();
} else {
    loadPosts();
}
