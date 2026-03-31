(function() {
  var editor = null, currentSlug = null, posts = [];

  // Inject CSS
  var style = document.createElement('style');
  style.textContent =
    '.ba-layout{display:flex;flex:1;overflow:hidden}' +
    '.ba-sidebar{width:200px;background:#fff;flex-shrink:0;border-right:2px solid;border-color:#808080 #dfdfdf;display:flex;flex-direction:column}' +
    '.ba-sidebar-hdr{background:#c0c0c0;padding:3px 6px;font-weight:bold;font-size:11px;border-bottom:1px solid #808080;display:flex;align-items:center;gap:4px}' +
    '.ba-sidebar-hdr img{width:16px;height:16px;image-rendering:pixelated}' +
    '.ba-sidebar-tb{background:#c0c0c0;padding:3px 5px;border-bottom:1px solid #808080}' +
    '.ba-new-btn{width:100%;height:22px;background:#c0c0c0;border:2px solid;border-color:#dfdfdf #000 #000 #dfdfdf;box-shadow:inset 1px 1px 0px #fff,inset -1px -1px 0px #808080;cursor:pointer;font-family:inherit;font-size:11px;font-weight:bold;display:flex;align-items:center;justify-content:center;gap:3px}' +
    '.ba-new-btn:active{border-color:#000 #dfdfdf #dfdfdf #000;box-shadow:inset -1px -1px 0px #fff,inset 1px 1px 0px #808080}' +
    '.ba-new-btn img{width:16px;height:16px;image-rendering:pixelated}' +
    '.ba-post-list{flex:1;overflow-y:auto}' +
    '.ba-pi{padding:4px 6px 4px 18px;cursor:default;display:flex;align-items:center;gap:5px;border-bottom:1px solid #f0f0f0;overflow:hidden}' +
    '.ba-pi:hover{background:#000080;color:#fff}.ba-pi:hover .ba-pi-date{color:#c0c0c0}' +
    '.ba-pi.active{background:#000080;color:#fff}.ba-pi.active .ba-pi-date{color:#c0c0c0}' +
    '.ba-pi img{width:16px;height:16px;image-rendering:pixelated;flex-shrink:0}' +
    '.ba-pi-info{flex:1;min-width:0;overflow:hidden}.ba-pi-title{font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ba-pi-date{font-size:10px;color:#808080}' +
    '.ba-editor{flex:1;display:flex;flex-direction:column;overflow:hidden}' +
    '.ba-fields{background:#c0c0c0;padding:4px 8px;display:flex;gap:6px;align-items:center;border-bottom:1px solid #808080;flex-shrink:0;flex-wrap:wrap}' +
    '.ba-fields label{font-size:11px;font-weight:bold}' +
    '.ba-fi{height:20px;background:#fff;padding:0 5px;border:2px solid;border-color:#808080 #dfdfdf #dfdfdf #808080;box-shadow:inset 1px 1px 0px #000;font-family:inherit;font-size:12px;flex:1}' +
    '.ba-fs{height:20px;background:#fff;padding:0 3px;border:2px solid;border-color:#808080 #dfdfdf #dfdfdf #808080;font-family:inherit;font-size:12px;width:55px}' +
    '.ba-ew{flex:1;overflow-y:auto;background:#fff;border:2px solid;border-color:#808080 #dfdfdf #dfdfdf #808080;margin:4px 8px;box-shadow:inset 1px 1px 0px #000}' +
    '.ba-ew .codex-editor{min-height:200px;padding:8px 0;font-family:"Times New Roman",Georgia,serif;font-size:16px}' +
    '.ba-actions{background:#c0c0c0;padding:4px 8px;display:flex;gap:5px;align-items:center;border-top:1px solid #808080;flex-shrink:0}' +
    '.ba-btn{height:22px;background:#c0c0c0;border:2px solid;border-color:#dfdfdf #000 #000 #dfdfdf;box-shadow:inset 1px 1px 0px #fff,inset -1px -1px 0px #808080;cursor:pointer;font-family:inherit;font-size:11px;display:flex;align-items:center;gap:3px;padding:0 12px}' +
    '.ba-btn:active{border-color:#000 #dfdfdf #dfdfdf #000;box-shadow:inset -1px -1px 0px #fff,inset 1px 1px 0px #808080}' +
    '.ba-btn:disabled{color:#808080;cursor:default}.ba-btn img{width:16px;height:16px;image-rendering:pixelated}' +
    '.ba-primary{font-weight:bold;outline:1px dotted #000;outline-offset:-4px}.ba-danger{color:#f00}' +
    '.ba-spacer{flex:1}.ba-link{font-size:11px;color:#000080;text-decoration:underline;cursor:pointer;display:none}';
  document.head.appendChild(style);

  function open() {
    if (WM.exists('admin')) { WM.show('admin'); return; }

    var body = WM.create('admin', {
      title: 'Blog Admin \u2014 New Post',
      icon: 'icons/help_book_cool-1.png',
      x: 100, y: 15, width: 850, height: 520,
      onClose: function() { if (editor) { editor.destroy(); editor = null; } },
    });

    body.innerHTML =
      '<div class="w-menubar">' +
        '<div class="w-menu-item"><u>F</u>ile</div><div class="w-menu-item"><u>E</u>dit</div>' +
        '<div class="w-menu-item"><u>V</u>iew</div><div class="w-menu-item"><u>I</u>nsert</div>' +
        '<div class="w-menu-item">F<u>o</u>rmat</div><div class="w-menu-item"><u>H</u>elp</div>' +
      '</div>' +
      '<div class="w-toolbar">' +
        '<div class="w-tb" id="ba-tb-new"><img src="icons/help_book_cool_small-0.png"> New</div>' +
        '<div class="w-tb" id="ba-tb-save"><img src="icons/save_file-0.png" onerror="this.outerHTML=\'&#128190;\'"> Save</div>' +
        '<div class="w-sep"></div>' +
        '<div class="w-tb" id="ba-tb-preview"><img src="icons/magnifying_glass-0.png" onerror="this.outerHTML=\'&#128270;\'"> Preview</div>' +
        '<div class="w-sep"></div>' +
        '<div class="w-tb" id="ba-tb-delete" style="opacity:0.4">Delete</div>' +
      '</div>' +
      '<div class="ba-layout">' +
        '<div class="ba-sidebar">' +
          '<div class="ba-sidebar-tb"><button class="ba-new-btn" id="ba-new-btn"><img src="icons/help_book_cool_small-0.png"> New Post</button></div>' +
          '<div class="ba-sidebar-hdr"><img src="icons/directory_folder_options-5.png"> Posts</div>' +
          '<div class="ba-post-list" id="ba-post-list"></div>' +
        '</div>' +
        '<div class="ba-editor">' +
          '<div class="ba-fields">' +
            '<label>Title:</label><input class="ba-fi" type="text" id="ba-title" placeholder="Post title" style="flex:3">' +
            '<label>Slug:</label><input class="ba-fi" type="text" id="ba-slug" placeholder="post-slug" style="flex:2">' +
            '<label>Lang:</label><select class="ba-fs" id="ba-lang"><option value="en">EN</option><option value="ru">RU</option></select>' +
          '</div>' +
          '<div class="ba-ew"><div id="ba-editorjs"></div></div>' +
          '<div class="ba-actions">' +
            '<button class="ba-btn ba-primary" id="ba-save-btn">Publish</button>' +
            '<button class="ba-btn ba-danger" id="ba-delete-btn" disabled>Delete</button>' +
            '<div class="ba-spacer"></div>' +
            '<span class="ba-link" id="ba-post-link">View post</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="w-statusbar"><span class="w-status" id="ba-status">Ready</span><span class="w-status" id="ba-count"></span></div>';

    var bucket = BLOG_CONFIG.bucket;
    var cdnUrl = 'https://' + bucket + '.' + BLOG_CONFIG.endpoint.replace('https://', '');
    var s3 = new AWS.S3({ endpoint: new AWS.Endpoint(BLOG_CONFIG.endpoint), accessKeyId: BLOG_CONFIG.accessKey, secretAccessKey: BLOG_CONFIG.secretKey, s3ForcePathStyle: false, signatureVersion: 'v4' });

    function setStatus(m) { var el = document.getElementById('ba-status'); if (el) el.textContent = m; }
    function updateLink(slug) {
      var el = document.getElementById('ba-post-link');
      if (!el) return;
      if (slug) { el.style.display = 'inline'; el.onclick = function() { AppRegistry.open('internet-explorer', { url: 'https://timur.cool/blog/' + slug }); }; }
      else el.style.display = 'none';
    }

    function getIndex() { return s3.getObject({ Bucket: bucket, Key: 'blog/index.json' }).promise().then(function(d) { return JSON.parse(new TextDecoder().decode(d.Body)); }).catch(function() { return { posts: [] }; }); }
    function saveIndex(idx) { return s3.putObject({ Bucket: bucket, Key: 'blog/index.json', Body: JSON.stringify(idx), ContentType: 'application/json', ACL: 'public-read' }).promise(); }
    function getPost(slug) { return s3.getObject({ Bucket: bucket, Key: 'blog/posts/' + slug + '.json' }).promise().then(function(d) { return JSON.parse(new TextDecoder().decode(d.Body)); }); }
    function putPost(p) { return s3.putObject({ Bucket: bucket, Key: 'blog/posts/' + p.slug + '.json', Body: JSON.stringify(p), ContentType: 'application/json', ACL: 'public-read' }).promise(); }
    function rmPost(s) { return s3.deleteObject({ Bucket: bucket, Key: 'blog/posts/' + s + '.json' }).promise(); }
    function uploadImg(f) {
      setStatus('Uploading...');
      var k = 'blog/images/' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + f.name.split('.').pop();
      return s3.putObject({ Bucket: bucket, Key: k, Body: f, ContentType: f.type, ACL: 'public-read' }).promise().then(function() { setStatus('Uploaded'); return cdnUrl + '/' + k; });
    }
    function excerpt(b) { for (var i = 0; i < b.length; i++) if (b[i].type === 'paragraph') return b[i].data.text.replace(/<[^>]*>/g, '').slice(0, 200); return ''; }
    function thumb(b) { for (var i = 0; i < b.length; i++) if (b[i].type === 'image' && b[i].data && b[i].data.file) return b[i].data.file.url; return ''; }

    function loadPosts() {
      setStatus('Loading...');
      return getIndex().then(function(d) {
        posts = d.posts || []; renderList();
        var el = document.getElementById('ba-count'); if (el) el.textContent = posts.length + ' post(s)';
        setStatus('Ready');
      }).catch(function(e) { Toast.show(e.message, 'error'); });
    }

    function renderList() {
      var el = document.getElementById('ba-post-list');
      if (!el) return;
      if (!posts.length) { el.innerHTML = '<div style="padding:16px;text-align:center;color:#808080;font-size:11px">No posts</div>'; return; }
      el.innerHTML = posts.map(function(p) {
        var a = p.slug === currentSlug ? ' active' : '';
        return '<div class="ba-pi' + a + '" data-slug="' + p.slug + '"><img src="icons/help_book_cool-1.png"><div class="ba-pi-info"><div class="ba-pi-title">' + p.title + '</div><div class="ba-pi-date">' + new Date(p.updatedAt).toLocaleDateString() + '</div></div></div>';
      }).join('');
      el.querySelectorAll('.ba-pi').forEach(function(e) { e.addEventListener('click', function() { editPost(e.dataset.slug); }); });
    }

    function initEd(data) {
      if (editor) { editor.destroy(); editor = null; }
      var holder = document.getElementById('ba-editorjs');
      if (!holder) return;
      holder.innerHTML = '';
      editor = new EditorJS({ holder: 'ba-editorjs', data: data || {}, placeholder: 'Start writing...', tools: {
        header: { class: Header, config: { levels: [2,3,4], defaultLevel: 2 } }, list: { class: List },
        image: { class: ImageTool, config: { uploader: { uploadByFile: function(f) { return uploadImg(f).then(function(u) { return { success: 1, file: { url: u } }; }); } } } },
        code: { class: CodeTool }, quote: { class: Quote }, delimiter: { class: Delimiter },
        inlineCode: { class: InlineCode }, marker: { class: Marker }, embed: { class: Embed },
      }});
    }

    function newPost() {
      currentSlug = null;
      var t = document.getElementById('ba-title'); if (t) t.value = '';
      var s = document.getElementById('ba-slug'); if (s) s.value = '';
      var l = document.getElementById('ba-lang'); if (l) l.value = 'en';
      var d = document.getElementById('ba-delete-btn'); if (d) d.disabled = true;
      var td = document.getElementById('ba-tb-delete'); if (td) td.style.opacity = '0.4';
      updateLink(null);
      WM.setTitle('admin', 'Blog Admin \u2014 New Post');
      initEd(); renderList(); setStatus('New post');
    }

    function editPost(slug) {
      setStatus('Loading...');
      getPost(slug).then(function(p) {
        currentSlug = p.slug;
        document.getElementById('ba-title').value = p.title;
        document.getElementById('ba-slug').value = p.slug;
        document.getElementById('ba-lang').value = p.lang || 'en';
        document.getElementById('ba-delete-btn').disabled = false;
        document.getElementById('ba-tb-delete').style.opacity = '1';
        updateLink(slug);
        WM.setTitle('admin', 'Blog Admin \u2014 ' + p.title + '.doc');
        initEd(p.content); renderList(); setStatus('Editing: ' + p.title);
      }).catch(function(e) { Toast.show(e.message, 'error'); });
    }

    function savePost() {
      var title = document.getElementById('ba-title').value.trim();
      var slug = document.getElementById('ba-slug').value.trim();
      var lang = document.getElementById('ba-lang').value;
      if (!title || !slug) { Toast.show('Title and slug required', 'error'); return; }
      setStatus('Saving...');
      editor.save().then(function(content) {
        var now = new Date().toISOString();
        return getIndex().then(function(idx) {
          var ex = null; for (var i = 0; i < idx.posts.length; i++) if (idx.posts[i].slug === slug) { ex = idx.posts[i]; break; }
          var post = { slug: slug, title: title, content: content, lang: lang, createdAt: ex ? ex.createdAt : now, updatedAt: now };
          return putPost(post).then(function() {
            var e = excerpt(content.blocks || []), t = thumb(content.blocks || []);
            if (ex) { ex.title = title; ex.lang = lang; ex.excerpt = e; ex.thumbnail = t; ex.updatedAt = now; }
            else idx.posts.unshift({ slug: slug, title: title, lang: lang, excerpt: e, thumbnail: t, createdAt: now, updatedAt: now });
            return saveIndex(idx);
          }).then(function() {
            currentSlug = slug;
            document.getElementById('ba-delete-btn').disabled = false;
            document.getElementById('ba-tb-delete').style.opacity = '1';
            posts = idx.posts; renderList(); updateLink(slug);
            WM.setTitle('admin', 'Blog Admin \u2014 ' + title + '.doc');
            var el = document.getElementById('ba-count'); if (el) el.textContent = posts.length + ' post(s)';
            setStatus('Published'); Toast.show('Published!', 'success', 'https://timur.cool/blog/' + slug);
          });
        });
      }).catch(function(e) { Toast.show(e.message, 'error'); setStatus('Error'); });
    }

    function delPost() {
      if (!currentSlug || !confirm('Delete "' + currentSlug + '"?')) return;
      var d = currentSlug; setStatus('Deleting...');
      rmPost(d).then(function() { return getIndex(); }).then(function(idx) {
        idx.posts = idx.posts.filter(function(p) { return p.slug !== d; });
        return saveIndex(idx).then(function() {
          posts = idx.posts;
          var el = document.getElementById('ba-count'); if (el) el.textContent = posts.length + ' post(s)';
          Toast.show('Deleted', 'success'); newPost();
        });
      }).catch(function(e) { Toast.show(e.message, 'error'); });
    }

    // Slug auto-gen
    document.getElementById('ba-title').addEventListener('input', function(e) {
      if (!currentSlug) document.getElementById('ba-slug').value = e.target.value.toLowerCase().replace(/[^a-z0-9\u0430-\u044f\u0451]+/gi, '-').replace(/^-|-$/g, '');
    });

    // Buttons
    document.getElementById('ba-new-btn').addEventListener('click', newPost);
    document.getElementById('ba-save-btn').addEventListener('click', savePost);
    document.getElementById('ba-delete-btn').addEventListener('click', delPost);
    document.getElementById('ba-tb-new').addEventListener('click', newPost);
    document.getElementById('ba-tb-save').addEventListener('click', savePost);
    document.getElementById('ba-tb-delete').addEventListener('click', function() { if (currentSlug) delPost(); });
    document.getElementById('ba-tb-preview').addEventListener('click', function() {
      if (currentSlug) AppRegistry.open('internet-explorer', { url: 'https://timur.cool/blog/' + currentSlug });
      else Toast.show('Save first', 'error');
    });

    // Shortcuts
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); savePost(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); newPost(); }
    });

    loadPosts(); initEd();
  }

  AppRegistry.register('blog-admin', {
    title: 'Blog Admin',
    icon: 'icons/help_book_cool-1.png',
    description: 'Write and publish posts',
    open: open,
    startMenu: true,
    desktop: true,
  });
})();
