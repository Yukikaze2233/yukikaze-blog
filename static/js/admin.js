(function () {
    'use strict';

    var GITHUB_API = 'https://api.github.com';
    var REPO = 'Yukikaze2233/yukikaze-blog';

    var $ = function (id) { return document.getElementById(id); };

    var tokenBox = $('tokenBox');
    var editorBox = $('editorBox');
    var adminList = $('adminList');
    var toastEl = $('toast');
    var editor = $('editor');
    var preview = $('preview');

    var currentSha = null;
    var currentSlug = '';
    var currentFrontMatter = '';
    var toastTimer = null;

    function token() {
        return localStorage.getItem('yukikaze-blog-admin-token') || '';
    }

    function showToast(msg) {
        if (!toastEl) return;
        toastEl.textContent = msg;
        toastEl.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2600);
    }

    function ghHeaders(extra) {
        var h = {
            Authorization: 'token ' + token(),
            Accept: 'application/vnd.github+json'
        };
        if (extra) Object.assign(h, extra);
        return h;
    }

    function ghFetch(path, options) {
        return fetch(GITHUB_API + path, options).then(function (r) {
            return r.json().then(function (body) {
                if (!r.ok) {
                    var msg = (body && body.message) || ('HTTP ' + r.status);
                    throw new Error(msg);
                }
                return body;
            });
        });
    }

    function renderPreview() {
        var html = marked.parse(editor.value || '*（暂无内容）*');
        preview.innerHTML = html;
        preview.querySelectorAll('pre code').forEach(function (block) {
            hljs.highlightElement(block);
        });
    }

    function toIsoDate(d) {
        var x = new Date(d);
        var off = x.getTimezoneOffset();
        var local = new Date(x.getTime() - off * 60 * 1000);
        return local.toISOString().slice(0, 10);
    }

    function formatDateCn(d) {
        var x = new Date(d + 'T00:00:00');
        if (isNaN(x.getTime())) return d;
        return d + ' · ' + x.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function parseFrontMatter(md) {
        var m = /^---\s*\n([\s\S]*?)\n---\s*\n?/.exec(md);
        if (!m) return {};
        var fm = {};
        m[1].split('\n').forEach(function (line) {
            var idx = line.indexOf(':');
            if (idx < 0) return;
            var key = line.slice(0, idx).trim();
            var value = line.slice(idx + 1).trim();
            if (value.startsWith('[') && value.endsWith(']')) {
                value = value.slice(1, -1).split(',').map(function (s) { return s.trim().replace(/^['"]|['"]$/g, ''); }).filter(Boolean);
            } else {
                value = value.replace(/^['"]|['"]$/g, '');
            }
            fm[key] = value;
        });
        return fm;
    }

    function buildFrontMatter() {
        var title = $('fieldTitle').value.trim() || '未命名文章';
        var date = $('fieldDate').value || toIsoDate(new Date());
        var excerpt = $('fieldExcerpt').value.trim();
        var tags = $('fieldTags').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        var lines = ['---', 'title: ' + title, 'date: ' + date];
        if (excerpt) lines.push('excerpt: ' + excerpt);
        lines.push('tags: [' + tags.join(', ') + ']');
        lines.push('---');
        return lines.join('\n') + '\n\n' + editor.value.replace(/^\s+/, '');
    }

    function fillEditor(slug, md) {
        var fm = parseFrontMatter(md);
        currentSlug = slug;
        $('fieldSlug').value = slug;
        $('fieldTitle').value = fm.title || '';
        $('fieldDate').value = fm.date || toIsoDate(new Date());
        $('fieldTags').value = (fm.tags || []).join(', ');
        $('fieldExcerpt').value = fm.excerpt || '';
        editor.value = md.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '');
        currentFrontMatter = '';
        $('editorStatus').textContent = slug ? '编辑：' + slug : '新建文章';
        renderPreview();
    }

    function newPost() {
        currentSha = null;
        currentSlug = '';
        $('fieldSlug').value = '';
        $('fieldTitle').value = '';
        $('fieldDate').value = toIsoDate(new Date());
        $('fieldTags').value = '';
        $('fieldExcerpt').value = '';
        editor.value = '';
        $('editorStatus').textContent = '新建文章';
        renderPreview();
        editorBox.hidden = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function savePost() {
        var slug = $('fieldSlug').value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
        if (!slug) {
            showToast('请填写 slug（英文文件名）');
            return;
        }
        var content = buildFrontMatter();
        var existingSha = currentSlug === slug ? currentSha : null;
        var path = 'posts/' + slug + '.md';

        var body = { message: (existingSha ? 'update: ' : 'create: ') + slug + ' via blog admin', content: btoa(unescape(encodeURIComponent(content))) };
        if (existingSha) body.sha = existingSha;

        ghFetch('/repos/' + REPO + '/contents/' + path, {
            method: 'PUT',
            headers: ghHeaders(),
            body: JSON.stringify(body)
        }).then(function (res) {
            showToast(existingSha ? '文章已更新' : '文章已创建');
            currentSha = (res.content && res.content.sha) || null;
            currentSlug = slug;
            loadAdminList();
        }).catch(function (err) {
            showToast('保存失败：' + err.message);
        });
    }

    function removePost(slug, sha) {
        if (!confirm('确定删除文章「' + slug + '」吗？删除后可以在 Git 历史中找回。')) return;
        ghFetch('/repos/' + REPO + '/contents/posts/' + slug + '.md', {
            method: 'DELETE',
            headers: ghHeaders(),
            body: JSON.stringify({ message: 'delete: ' + slug + ' via blog admin', sha: sha })
        }).then(function () {
            showToast('文章已删除');
            if (currentSlug === slug) editorBox.hidden = true;
            loadAdminList();
        }).catch(function (err) {
            showToast('删除失败：' + err.message);
        });
    }

    function loadAdminList() {
        if (!token()) return;

        ghFetch('/repos/' + REPO + '/contents/posts')
            .then(function (files) {
                if (!Array.isArray(files)) throw new Error('读取 posts 目录失败');
                var mdFiles = files.filter(function (f) { return f.type === 'file' && f.name.endsWith('.md'); });

                adminList.innerHTML = '';
                if (!mdFiles.length) {
                    adminList.innerHTML = '<div class="post-card"><h3>还没有文章</h3><p>点击右上角「新建文章」开始写。</p></div>';
                    return;
                }

                var jobs = mdFiles.map(function (f) {
                    return ghFetch('/repos/' + REPO + '/contents/' + f.path).then(function (file) {
                        return { file: f, md: decodeURIComponent(escape(atob(file.content))) };
                    });
                });

                return Promise.all(jobs).then(function (rows) {
                    rows.sort(function (a, b) {
                        return parseFrontMatter(b.md).date.localeCompare(parseFrontMatter(a.md).date);
                    });
                    rows.forEach(function (row) {
                        var fm = parseFrontMatter(row.md);
                        var card = document.createElement('div');
                        card.className = 'post-card admin-post-card';

                        var h3 = document.createElement('h3');
                        h3.textContent = fm.title || row.file.name;

                        var meta = document.createElement('div');
                        meta.className = 'post-meta';
                        meta.textContent = (fm.date ? formatDateCn(fm.date) : '') + ' · ' + row.file.name;

                        var actions = document.createElement('div');
                        actions.className = 'admin-actions';

                        var editBtn = document.createElement('button');
                        editBtn.className = 'btn btn-ghost';
                        editBtn.type = 'button';
                        editBtn.textContent = '编辑';
                        editBtn.addEventListener('click', function () {
                            currentSha = row.file.sha;
                            fillEditor(row.file.name.replace(/\.md$/, ''), row.md);
                            editorBox.hidden = false;
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        });

                        var delBtn = document.createElement('button');
                        delBtn.className = 'btn btn-danger';
                        delBtn.type = 'button';
                        delBtn.textContent = '删除';
                        delBtn.addEventListener('click', function () {
                            removePost(row.file.name.replace(/\.md$/, ''), row.file.sha);
                        });

                        actions.appendChild(editBtn);
                        actions.appendChild(delBtn);
                        card.appendChild(h3);
                        card.appendChild(meta);
                        card.appendChild(actions);
                        adminList.appendChild(card);
                    });
                });
            })
            .catch(function (err) {
                adminList.innerHTML = '<div class="post-card"><h3>读取失败</h3><p>' + err.message + '</p></div>';
            });
    }

    function updateUI() {
        var hasToken = !!token();
        tokenBox.hidden = hasToken;
        if (hasToken) {
            editorBox.hidden = false;
            loadAdminList();
        }
    }

    $('btnSaveToken').addEventListener('click', function () {
        var value = $('tokenInput').value.trim();
        if (!value) {
            showToast('请输入 Token');
            return;
        }
        localStorage.setItem('yukikaze-blog-admin-token', value);
        updateUI();
        showToast('Token 已保存');
    });

    $('btnNew').addEventListener('click', newPost);
    $('btnCancel').addEventListener('click', function () {
        editorBox.hidden = true;
    });
    $('btnSave').addEventListener('click', savePost);
    editor.addEventListener('input', renderPreview);

    if (marked && marked.setOptions) {
        marked.setOptions({ breaks: true, gfm: true });
    }

    updateUI();
})();
