(function () {
  'use strict';

  var data = BlogData.load();

  var viewList = document.getElementById('view-list');
  var viewDetail = document.getElementById('view-detail');
  var postGrid = document.getElementById('postGrid');
  var emptyState = document.getElementById('emptyState');
  var categoryFilters = document.getElementById('categoryFilters');
  var tagFilter = document.getElementById('tagFilter');
  var btnBackToList = document.getElementById('btnBackToList');
  var postDetail = document.getElementById('postDetail');
  var commentCount = document.getElementById('commentCount');
  var commentList = document.getElementById('commentList');
  var commentMsg = document.getElementById('commentMsg');
  var commentForm = document.getElementById('commentForm');
  var commentNameInput = document.getElementById('commentNameInput');
  var commentContentInput = document.getElementById('commentContentInput');

  var currentCategory = 'all';
  var currentTag = 'all';
  var currentPostId = null;

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function publishedPosts() {
    return data.posts.filter(function (p) { return p.published; });
  }

  function switchView(name) {
    viewList.classList.toggle('active', name === 'list');
    viewDetail.classList.toggle('active', name === 'detail');
    window.scrollTo(0, 0);
  }

  // ---------- Filters ----------
  function renderCategoryFilters() {
    var cats = [];
    publishedPosts().forEach(function (p) {
      if (cats.indexOf(p.category) === -1) cats.push(p.category);
    });
    var html = '<button class="filter-btn' + (currentCategory === 'all' ? ' active' : '') + '" data-category="all">全部</button>';
    html += cats.map(function (c) {
      return '<button class="filter-btn' + (currentCategory === c ? ' active' : '') + '" data-category="' + escapeHtml(c) + '">' + escapeHtml(c) + '</button>';
    }).join('');
    categoryFilters.innerHTML = html;
    categoryFilters.querySelectorAll('.filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentCategory = btn.dataset.category;
        renderCategoryFilters();
        renderList();
      });
    });
  }

  function renderTagFilterOptions() {
    var tags = [];
    publishedPosts().forEach(function (p) {
      (p.tags || []).forEach(function (t) { if (tags.indexOf(t) === -1) tags.push(t); });
    });
    var selected = tagFilter.value || 'all';
    tagFilter.innerHTML = '<option value="all">全部标签</option>' + tags.map(function (t) {
      return '<option value="' + escapeHtml(t) + '">' + escapeHtml(t) + '</option>';
    }).join('');
    tagFilter.value = tags.indexOf(selected) !== -1 ? selected : 'all';
  }

  tagFilter.addEventListener('change', function () {
    currentTag = tagFilter.value;
    renderList();
  });

  // ---------- List ----------
  function renderList() {
    var list = publishedPosts().filter(function (p) {
      if (currentCategory !== 'all' && p.category !== currentCategory) return false;
      if (currentTag !== 'all' && (p.tags || []).indexOf(currentTag) === -1) return false;
      return true;
    }).sort(function (a, b) { return a.publishedAt < b.publishedAt ? 1 : -1; });

    if (!list.length) {
      postGrid.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    postGrid.innerHTML = list.map(function (p) {
      return '<div class="post-card" data-id="' + p.id + '">' +
        '<div class="post-card__cover">' + p.coverEmoji + '</div>' +
        '<div class="post-card__body">' +
        '<span class="badge category">' + escapeHtml(p.category) + '</span>' +
        '<h3>' + escapeHtml(p.title) + '</h3>' +
        '<p class="post-card__excerpt">' + escapeHtml(p.excerpt) + '</p>' +
        '<div class="post-card__meta">' + p.publishedAt + ' &middot; 👁 ' + p.viewCount + ' 次浏览</div>' +
        '</div></div>';
    }).join('');

    postGrid.querySelectorAll('.post-card').forEach(function (card) {
      card.addEventListener('click', function () { openDetail(card.dataset.id); });
    });
  }

  // ---------- Detail ----------
  function approvedCommentsFor(postId) {
    return data.comments.filter(function (c) { return c.postId === postId && c.approved; });
  }

  function openDetail(id) {
    var post = data.posts.find(function (p) { return p.id === id && p.published; });
    if (!post) return;

    post.viewCount = (post.viewCount || 0) + 1;
    BlogData.save(data);
    currentPostId = id;

    var paragraphs = (post.content || '').split(/\n\n+/).map(function (para) {
      return '<p>' + escapeHtml(para).replace(/\n/g, '<br>') + '</p>';
    }).join('');

    postDetail.innerHTML =
      '<div class="post-detail__cover">' + post.coverEmoji + '</div>' +
      '<span class="badge category">' + escapeHtml(post.category) + '</span>' +
      '<h1>' + escapeHtml(post.title) + '</h1>' +
      '<div class="post-detail__meta">' + post.publishedAt + ' &middot; 👁 ' + post.viewCount + ' 次浏览</div>' +
      '<div class="post-detail__tags">' + (post.tags || []).map(function (t) { return '<span class="tag-chip">#' + escapeHtml(t) + '</span>'; }).join('') + '</div>' +
      '<div class="post-detail__content">' + paragraphs + '</div>';

    renderComments();
    commentMsg.innerHTML = '';
    commentForm.reset();
    switchView('detail');
  }

  function renderComments() {
    var list = approvedCommentsFor(currentPostId).sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; });
    commentCount.textContent = '(' + list.length + ')';
    commentList.innerHTML = list.map(function (c) {
      return '<div class="comment-item">' +
        '<div class="comment-item__head"><strong>' + escapeHtml(c.authorName) + '</strong><span>' + c.createdAt + '</span></div>' +
        '<p>' + escapeHtml(c.content) + '</p></div>';
    }).join('') || '<div class="comment-empty">还没有评论，来发表第一条吧。</div>';
  }

  btnBackToList.addEventListener('click', function () {
    switchView('list');
    renderCategoryFilters();
    renderTagFilterOptions();
    renderList();
  });

  function showCommentMsg(text, isError) {
    commentMsg.innerHTML = '<div class="msg ' + (isError ? 'error' : 'success') + '">' + text + '</div>';
  }

  commentForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!currentPostId) return;

    var name = commentNameInput.value.trim();
    var content = commentContentInput.value.trim();

    if (!name) return showCommentMsg('请填写昵称。', true);
    if (!content) return showCommentMsg('请填写评论内容。', true);

    var comment = {
      id: BlogData.uid('c'),
      postId: currentPostId,
      authorName: name,
      content: content,
      createdAt: new Date().toISOString().slice(0, 10),
      approved: false,
    };
    data.comments.push(comment);
    BlogData.save(data);

    showCommentMsg('评论已提交，审核通过后将显示。', false);
    commentForm.reset();
    renderComments();
  });

  renderCategoryFilters();
  renderTagFilterOptions();
  renderList();
})();
