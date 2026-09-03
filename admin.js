(function () {
  'use strict';

  var data = BlogData.load();

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var sideLinks = document.querySelectorAll('.side-link[data-view]');
  var views = document.querySelectorAll('.admin-view');

  function switchView(name) {
    sideLinks.forEach(function (l) { l.classList.toggle('active', l.dataset.view === name); });
    views.forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + name); });
    if (name === 'dashboard') renderDashboard();
    if (name === 'posts') renderPosts();
    if (name === 'comments') renderComments();
  }

  sideLinks.forEach(function (l) {
    l.addEventListener('click', function () { switchView(l.dataset.view); });
  });

  document.getElementById('btnResetData').addEventListener('click', function () {
    if (!confirm('确定要重置成示例数据吗？这会清空你新增/修改的所有内容。')) return;
    data = BlogData.reset();
    switchView('dashboard');
  });

  function postTitle(id) {
    var p = data.posts.find(function (x) { return x.id === id; });
    return p ? p.title : '（已删除文章）';
  }

  // ---------- Dashboard ----------
  function renderDashboard() {
    var totalPosts = data.posts.length;
    var publishedCount = data.posts.filter(function (p) { return p.published; }).length;
    var totalViews = data.posts.reduce(function (sum, p) { return sum + (p.viewCount || 0); }, 0);
    var pendingCount = data.comments.filter(function (c) { return !c.approved; }).length;

    var stats = [
      { label: '文章总数', value: totalPosts },
      { label: '已发布文章', value: publishedCount },
      { label: '总浏览量', value: totalViews },
      { label: '待审核评论', value: pendingCount },
    ];
    document.getElementById('statGrid').innerHTML = stats.map(function (s) {
      return '<div class="stat-card"><div class="num">' + s.value + '</div><div class="label">' + s.label + '</div></div>';
    }).join('');

    var top = data.posts.slice().sort(function (a, b) { return (b.viewCount || 0) - (a.viewCount || 0); }).slice(0, 5);
    document.getElementById('topPostsBody').innerHTML = top.map(function (p) {
      return '<tr><td>' + escapeHtml(p.title) + '</td><td>' + escapeHtml(p.category) + '</td><td>' + (p.viewCount || 0) + '</td>' +
        '<td><span class="badge ' + (p.published ? 'approved' : 'draft') + '">' + (p.published ? '已发布' : '草稿') + '</span></td></tr>';
    }).join('') || '<tr><td colspan="4" style="color:var(--muted)">暂无文章</td></tr>';
  }

  // ---------- Posts ----------
  var postModalBackdrop = document.getElementById('postModalBackdrop');
  var postModalTitle = document.getElementById('postModalTitle');
  var postModalMsg = document.getElementById('postModalMsg');
  var postForm = document.getElementById('postForm');
  var postIdInput = document.getElementById('postIdInput');
  var postTitleInput = document.getElementById('postTitleInput');
  var postSlugInput = document.getElementById('postSlugInput');
  var postExcerptInput = document.getElementById('postExcerptInput');
  var postContentInput = document.getElementById('postContentInput');
  var postCategoryInput = document.getElementById('postCategoryInput');
  var postTagsInput = document.getElementById('postTagsInput');
  var postEmojiInput = document.getElementById('postEmojiInput');
  var postPublishedInput = document.getElementById('postPublishedInput');

  function renderPosts() {
    document.getElementById('postsBody').innerHTML = data.posts.map(function (p) {
      return '<tr><td>' + escapeHtml(p.title) + '</td><td>' + escapeHtml(p.category) + '</td>' +
        '<td>' + (p.tags || []).map(function (t) { return escapeHtml(t); }).join(', ') + '</td>' +
        '<td>' + (p.viewCount || 0) + '</td>' +
        '<td><span class="badge ' + (p.published ? 'approved' : 'draft') + '">' + (p.published ? '已发布' : '草稿') + '</span></td>' +
        '<td class="table-actions">' +
        '<button class="btn btn-sm" data-edit="' + p.id + '">编辑</button>' +
        '<button class="btn btn-sm btn-danger" data-delete="' + p.id + '">删除</button>' +
        '</td></tr>';
    }).join('') || '<tr><td colspan="6" style="color:var(--muted)">暂无文章</td></tr>';

    document.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () { openPostModal(btn.dataset.edit); });
    });
    document.querySelectorAll('[data-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () { deletePost(btn.dataset.delete); });
    });
  }

  function openPostModal(id) {
    postModalMsg.innerHTML = '';
    postForm.reset();
    if (id) {
      var p = data.posts.find(function (x) { return x.id === id; });
      postModalTitle.textContent = '编辑文章';
      postIdInput.value = p.id;
      postTitleInput.value = p.title;
      postSlugInput.value = p.slug;
      postExcerptInput.value = p.excerpt;
      postContentInput.value = p.content;
      postCategoryInput.value = p.category;
      postTagsInput.value = (p.tags || []).join(', ');
      postEmojiInput.value = p.coverEmoji || '';
      postPublishedInput.checked = !!p.published;
    } else {
      postModalTitle.textContent = '新增文章';
      postIdInput.value = '';
      postPublishedInput.checked = false;
    }
    postModalBackdrop.classList.add('show');
  }

  document.getElementById('btnAddPost').addEventListener('click', function () { openPostModal(null); });
  document.getElementById('btnClosePostModal').addEventListener('click', function () { postModalBackdrop.classList.remove('show'); });
  postModalBackdrop.addEventListener('click', function (e) { if (e.target === postModalBackdrop) postModalBackdrop.classList.remove('show'); });

  function slugify(title, fallbackId) {
    var s = String(title || '').toLowerCase().trim()
      .replace(/[^a-z0-9一-龥]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return s || ('post-' + fallbackId);
  }

  postForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var title = postTitleInput.value.trim();
    var excerpt = postExcerptInput.value.trim();
    var content = postContentInput.value.trim();
    var category = postCategoryInput.value.trim();
    var tags = postTagsInput.value.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
    var emoji = postEmojiInput.value.trim() || '📝';
    var published = postPublishedInput.checked;

    if (!title || !excerpt || !content || !category) {
      postModalMsg.innerHTML = '<div class="msg error">请完整填写标题、摘要、正文和分类。</div>';
      return;
    }

    var id = postIdInput.value;
    if (id) {
      var p = data.posts.find(function (x) { return x.id === id; });
      p.title = title;
      p.slug = postSlugInput.value.trim() || p.slug || slugify(title, p.id);
      p.excerpt = excerpt;
      p.content = content;
      p.category = category;
      p.tags = tags;
      p.coverEmoji = emoji;
      if (published && !p.publishedAt) p.publishedAt = new Date().toISOString().slice(0, 10);
      p.published = published;
    } else {
      var newId = BlogData.uid('p');
      data.posts.push({
        id: newId,
        title: title,
        slug: postSlugInput.value.trim() || slugify(title, newId),
        excerpt: excerpt,
        content: content,
        category: category,
        tags: tags,
        coverEmoji: emoji,
        published: published,
        publishedAt: published ? new Date().toISOString().slice(0, 10) : '',
        viewCount: 0,
      });
    }
    BlogData.save(data);
    postModalBackdrop.classList.remove('show');
    renderPosts();
  });

  function deletePost(id) {
    if (!confirm('确定删除这篇文章吗？文章下的所有评论也会一并删除。')) return;
    data.posts = data.posts.filter(function (p) { return p.id !== id; });
    data.comments = data.comments.filter(function (c) { return c.postId !== id; });
    BlogData.save(data);
    renderPosts();
  }

  // ---------- Comments ----------
  var currentCommentFilter = 'all';
  document.querySelectorAll('#commentFilters .filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      currentCommentFilter = btn.dataset.status;
      document.querySelectorAll('#commentFilters .filter-btn').forEach(function (b) { b.classList.toggle('active', b === btn); });
      renderComments();
    });
  });

  function renderComments() {
    var list = data.comments.filter(function (c) {
      if (currentCommentFilter === 'pending') return !c.approved;
      if (currentCommentFilter === 'approved') return c.approved;
      return true;
    }).slice().sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });

    document.getElementById('commentsBody').innerHTML = list.map(function (c) {
      var actions = '';
      if (!c.approved) actions += '<button class="btn btn-sm" data-approve="' + c.id + '">通过</button> ';
      actions += '<button class="btn btn-sm btn-danger" data-delete="' + c.id + '">删除</button>';
      return '<tr><td>' + escapeHtml(c.content) + '</td><td>' + escapeHtml(c.authorName) + '</td><td>' + escapeHtml(postTitle(c.postId)) + '</td><td>' + c.createdAt + '</td>' +
        '<td><span class="badge ' + (c.approved ? 'approved' : 'pending') + '">' + (c.approved ? '已通过' : '待审核') + '</span></td>' +
        '<td class="table-actions">' + actions + '</td></tr>';
    }).join('') || '<tr><td colspan="6" style="color:var(--muted)">暂无评论</td></tr>';

    document.querySelectorAll('[data-approve]').forEach(function (btn) {
      btn.addEventListener('click', function () { approveComment(btn.dataset.approve); });
    });
    document.querySelectorAll('#commentsBody [data-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteComment(btn.dataset.delete); });
    });
  }

  function approveComment(id) {
    var c = data.comments.find(function (x) { return x.id === id; });
    if (!c) return;
    c.approved = true;
    BlogData.save(data);
    renderComments();
  }

  function deleteComment(id) {
    if (!confirm('确定删除这条评论吗？')) return;
    data.comments = data.comments.filter(function (c) { return c.id !== id; });
    BlogData.save(data);
    renderComments();
  }

  switchView('dashboard');
})();
