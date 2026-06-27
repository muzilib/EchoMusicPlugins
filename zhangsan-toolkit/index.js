// ===== 张三工具集 =====
// Author: 张三
// 合集：热门排序 + 隐藏自建歌单 + 歌词自动隐藏控制栏 + 隐藏听歌识曲 + 顶部插件按钮
// 注意：右键下载已独立为单独插件，如需使用请安装 right-click-download
// 在插件设置面板中可独立开关每个功能

var ctx = null;
var disposeSettings = null;

// ================== 6. 顶部插件快捷按钮 ==================

var pbBtn = null;
var pbStyle = null;
var pbCheckLoop = null;

function startPluginBtn() {
  if (pbCheckLoop) return;
  // 注入 CSS
  if (!document.getElementById('zhs-pb-style')) {
    var s = document.createElement('style');
    s.id = 'zhs-pb-style';
    s.textContent = [
      '.zhs-plugin-btn {',
      '  width: 34px; height: 34px;',
      '  display: flex; align-items: center; justify-content: center;',
      '  border-radius: 50%;',
      '  transition: all 0.2s;',
      '  background: transparent; border: none;',
      '  color: var(--color-text-main); opacity: 0.6;',
      '  cursor: pointer; flex-shrink: 0;',
      '  margin-left: 2px;',
      '}',
      '.zhs-plugin-btn:hover {',
      '  opacity: 1;',
      '  background-color: var(--control-hover-bg);',
      '}',
      '.zhs-plugin-btn svg {',
      '  width: 18px; height: 18px;',
      '}',
    ].join('\n');
    document.head.appendChild(s);
    pbStyle = s;
  }
  // 轮询插入按钮（等待标题栏渲染）
  pbCheckLoop = setInterval(function() {
    var nav = document.querySelector('.titlebar-nav');
    if (!nav) return;
    var searchBox = nav.querySelector('.tb-search');
    if (!searchBox) return;
    // 检查是否已插入
    if (document.getElementById('zhs-pb-btn')) return;
    // 在搜索框之后插入按钮
    var btn = document.createElement('button');
    btn.id = 'zhs-pb-btn';
    btn.className = 'zhs-plugin-btn nav-btn';
    btn.title = '插件管理';
    // 工具箱图标 SVG
    btn.innerHTML = [
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"',
      '  stroke-linecap="round" stroke-linejoin="round">',
      '  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
      '</svg>',
    ].join('');
    btn.addEventListener('click', function() {
      if (ctx && ctx.router) {
        ctx.router.push('/main/settings/plugins');
      }
    });
    // 插入到搜索框后面
    searchBox.parentNode.insertBefore(btn, searchBox.nextSibling);
    pbBtn = btn;
    clearInterval(pbCheckLoop);
    pbCheckLoop = null;
  }, 800);
}

function stopPluginBtn() {
  if (pbCheckLoop) {
    clearInterval(pbCheckLoop);
    pbCheckLoop = null;
  }
  if (pbBtn) {
    pbBtn.remove();
    pbBtn = null;
  }
  if (pbStyle) {
    pbStyle.remove();
    pbStyle = null;
  }
  var s = document.getElementById('zhs-pb-style');
  if (s) s.remove();
}

// ===================== 1. 热门排序 =====================

var _asOriginFetch = null;
var _asInterceptor = false;

function startArtistSort() {
  if (_asInterceptor) return;
  _asInterceptor = true;
  try {
    var api = window.electron && window.electron.api;
    if (!api || typeof api.request !== 'function') return;
    _asOriginFetch = api.request;
    var self = api;
    self.request = function() {
      var args = arguments;
      if (args[0] && typeof args[0] === 'object' && args[0].url) {
        var url = args[0].url;
        if (url.indexOf('/artist/audios') !== -1) {
          if (!args[0].data) args[0].data = {};
          args[0].data.sort = 'hot';
        }
      } else if (typeof args[0] === 'string' && args[0].indexOf('/artist/audios') !== -1) {
        args[0] = args[0] + (args[0].indexOf('?') === -1 ? '?' : '&') + 'sort=hot';
      }
      return _asOriginFetch.apply(self, args);
    };
  } catch(e) { console.warn('[zhs] sort interceptor failed', e); }
}

function stopArtistSort() {
  if (!_asInterceptor) return;
  _asInterceptor = false;
  try {
    var api = window.electron && window.electron.api;
    if (api && _asOriginFetch) {
      api.request = _asOriginFetch;
      _asOriginFetch = null;
    }
  } catch(e) {}
}

// ================= 2. 隐藏自建歌单 =================

var hpStyle = null;
var hpCheckLoop = null;
var hpInitTimer = null;

function hpInjectCSS() {
  if (document.getElementById('zhs-hp-style')) return;
  var s = document.createElement('style');
  s.id = 'zhs-hp-style';
  s.textContent = [
    '.sidebar-playlist-tab:first-child { display: none !important; }',
    '.sidebar-rail-tab:first-child { display: none !important; }',
    '.sidebar-tab-divider { display: none !important; }',
  ].join('\n');
  document.head.appendChild(s);
  hpStyle = s;
}

function hpRemoveCSS() {
  if (hpStyle) { hpStyle.remove(); hpStyle = null; }
}

function hpTrySwitch() {
  var didSwitch = false;
  var tabs = document.querySelectorAll('.sidebar-playlist-tab');
  if (tabs.length >= 2) {
    var favTab = tabs[1];
    if (!favTab.classList.contains('text-primary')) {
      favTab.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      didSwitch = true;
    }
  }
  var railPlaylists = document.querySelector('.sidebar-rail-playlists');
  if (railPlaylists) {
    var railTabs = railPlaylists.querySelectorAll('.sidebar-rail-tab');
    if (railTabs.length >= 2) {
      var favRailTab = railTabs[1];
      if (!favRailTab.classList.contains('is-active')) {
        favRailTab.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        didSwitch = true;
      }
    }
  }
  return didSwitch;
}

function startHidePlaylist() {
  if (hpInitTimer || hpCheckLoop) return;
  hpInjectCSS();
  var retries = 0;
  hpInitTimer = setInterval(function() {
    retries++;
    if (hpTrySwitch() || retries >= 20) {
      clearInterval(hpInitTimer);
      hpInitTimer = null;
      hpCheckLoop = setInterval(function() { hpTrySwitch(); }, 3000);
    }
  }, 1000);
}

function stopHidePlaylist() {
  if (hpCheckLoop) { clearInterval(hpCheckLoop); hpCheckLoop = null; }
  if (hpInitTimer) { clearInterval(hpInitTimer); hpInitTimer = null; }
  hpRemoveCSS();
}

// ================ 3. 歌词自动隐藏控制栏 ================

var lhStyle = null;
var lhTimer = null;
var lhLoop = null;
var lhMoveTarget = null;
var LH_IDLE_MS = 2000;

function lhInjectCSS() {
  if (document.getElementById('zhs-lh-style')) return;
  var s = document.createElement('style');
  s.id = 'zhs-lh-style';
  s.textContent = [
    '.lyric-page-body .lyric-bar {',
    '  transition: visibility 0s 0.5s, opacity 0.5s ease !important;',
    '}',
    '.lyric-page-body.idle .lyric-bar {',
    '  visibility: hidden !important;',
    '  opacity: 0 !important;',
    '  transition: visibility 0s 2s, opacity 0.5s ease !important;',
    '}',
  ].join('\n');
  document.head.appendChild(s);
  lhStyle = s;
}

function lhRemoveCSS() {
  if (lhStyle) { lhStyle.remove(); lhStyle = null; }
}

function lhReset() {
  var body = document.querySelector('.lyric-page-body');
  if (!body) return;
  body.classList.remove('idle');
  clearTimeout(lhTimer);
  lhTimer = setTimeout(function() { body.classList.add('idle'); }, LH_IDLE_MS);
}

function lhOnMove() { lhReset(); }

function lhCleanup() {
  clearTimeout(lhTimer);
  lhTimer = null;
  if (lhMoveTarget) {
    lhMoveTarget.removeEventListener('mousemove', lhOnMove);
    lhMoveTarget = null;
  }
  var body = document.querySelector('.lyric-page-body');
  if (body) body.classList.remove('idle');
}

function startLyricHide() {
  if (lhLoop) return;
  lhInjectCSS();
  lhLoop = setInterval(function() {
    var body = document.querySelector('.lyric-page-body');
    if (!body) { lhCleanup(); return; }
    if (body !== lhMoveTarget) {
      if (lhMoveTarget) lhMoveTarget.removeEventListener('mousemove', lhOnMove);
      lhMoveTarget = body;
      body.addEventListener('mousemove', lhOnMove, { passive: true });
      lhReset();
    }
  }, 800);
}

function stopLyricHide() {
  if (lhLoop) { clearInterval(lhLoop); lhLoop = null; }
  lhRemoveCSS();
  lhCleanup();
}

// ================== 5. 隐藏顶部听歌识曲按钮 ==================

// ⚠️ 注意：编号 4（右键下载）已独立为 right-click-download 插件
// 功能编号 5 保持不变，此处保留原始编号以免修改太多其他引用

var hrStyle = null;

function startHideRecognize() {
  if (document.getElementById('zhs-hr-style')) return;
  var s = document.createElement('style');
  s.id = 'zhs-hr-style';
  s.textContent = '.title-bar .nav-btn[title="听歌识曲"] { display: none !important; }';
  document.head.appendChild(s);
  hrStyle = s;
}

function stopHideRecognize() {
  if (hrStyle) { hrStyle.remove(); hrStyle = null; }
}

// ================== 设置面板 ==================

// 读取存好的功能开关
var featureState = {};

async function loadFeatureState() {
  var saved = await ctx.storage.get('zhs-features');
  if (saved) {
    featureState = saved;
  } else {
    featureState = {
      artistSort: true,
      hidePlaylist: true,
      lyricHide: true,
      hideRecognize: false,
      pluginBtn: true,
    };
  }
}

async function saveFeatureState() {
  await ctx.storage.set('zhs-features', featureState);
}

function toggleFeature(id) {
  featureState[id] = !featureState[id];
  saveFeatureState();
  // 即时启停
  if (id === 'artistSort') {
    featureState.artistSort ? startArtistSort() : stopArtistSort();
  } else if (id === 'hidePlaylist') {
    featureState.hidePlaylist ? startHidePlaylist() : stopHidePlaylist();
  } else if (id === 'lyricHide') {
    featureState.lyricHide ? startLyricHide() : stopLyricHide();
  } else if (id === 'hideRecognize') {
    featureState.hideRecognize ? startHideRecognize() : stopHideRecognize();
  } else if (id === 'pluginBtn') {
    featureState.pluginBtn ? startPluginBtn() : stopPluginBtn();
  }
}

// ================== 入口 ==================

export async function activate(_ctx) {
  ctx = _ctx;

  await loadFeatureState();

  if (featureState.artistSort) startArtistSort();
  if (featureState.hidePlaylist) startHidePlaylist();
  if (featureState.lyricHide) startLyricHide();
  if (featureState.hideRecognize) startHideRecognize();
  if (featureState.pluginBtn) startPluginBtn();

  // 注册设置面板 — 使用 render 函数
  var h = ctx.vue.h;

  var SettingsComp = ctx.vue.defineComponent({
    name: 'ZhsSettings',
    setup: function() {
      var state = ctx.vue.reactive({
        features: [
          { id: 'artistSort', label: '歌手热门排序', desc: '歌手详情页默认按热门排序', enabled: featureState.artistSort, icon: 'sort' },
          { id: 'hidePlaylist', label: '隐藏自建歌单', desc: '隐藏侧边栏自建歌单及tab按钮', enabled: featureState.hidePlaylist, icon: 'hide' },
          { id: 'lyricHide', label: '歌词隐藏控制栏', desc: '歌词全屏时控制栏2秒无操作自动隐藏', enabled: featureState.lyricHide, icon: 'lyric' },
          { id: 'hideRecognize', label: '隐藏听歌识曲', desc: '隐藏顶部导航栏的听歌识曲按钮', enabled: featureState.hideRecognize, icon: 'mic-off' },
          { id: 'pluginBtn', label: '顶部插件按钮', desc: '搜索框右侧添加插件快捷按钮', enabled: featureState.pluginBtn, icon: 'toolbox' },
        ],
      });

      ctx.vue.watch(function() {
        return state.features.map(function(f) { return f.enabled; });
      }, function() {
        state.features.forEach(function(f) { featureState[f.id] = f.enabled; });
        saveFeatureState();
        state.features.forEach(function(f) {
          if (f.id === 'artistSort') { f.enabled ? startArtistSort() : stopArtistSort(); }
          else if (f.id === 'hidePlaylist') { f.enabled ? startHidePlaylist() : stopHidePlaylist(); }
          else if (f.id === 'lyricHide') { f.enabled ? startLyricHide() : stopLyricHide(); }
          else if (f.id === 'hideRecognize') { f.enabled ? startHideRecognize() : stopHideRecognize(); }
          else if (f.id === 'pluginBtn') { f.enabled ? startPluginBtn() : stopPluginBtn(); }
        });
      }, { deep: true });

      var icons = {
        sort:   h('svg', { class: 'zhs-icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
                  h('line', { x1: '8', y1: '6', x2: '21', y2: '6' }),
                  h('line', { x1: '8', y1: '12', x2: '21', y2: '12' }),
                  h('line', { x1: '8', y1: '18', x2: '21', y2: '18' }),
                  h('line', { x1: '3', y1: '6', x2: '3.01', y2: '6' }),
                  h('line', { x1: '3', y1: '12', x2: '3.01', y2: '12' }),
                  h('line', { x1: '3', y1: '18', x2: '3.01', y2: '18' }),
                ]),
        hide:   h('svg', { class: 'zhs-icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
                  h('path', { d: 'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94' }),
                  h('path', { d: 'M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19' }),
                  h('line', { x1: '1', y1: '1', x2: '23', y2: '23' }),
                ]),
        lyric:  h('svg', { class: 'zhs-icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
                  h('path', { d: 'M9 18V5l12-2v13' }),
                  h('circle', { cx: '6', cy: '18', r: '3' }),
                  h('circle', { cx: '18', cy: '16', r: '3' }),
                ]),
        'mic-off': h('svg', { class: 'zhs-icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
                  h('line', { x1: '1', y1: '1', x2: '23', y2: '23' }),
                  h('path', { d: 'M9 9v3a3 3 0 0 0 5.12 2.12' }),
                  h('path', { d: 'M15 9.34V4a3 3 0 0 0-5.94-.6' }),
                  h('path', { d: 'M17 16.95A7 7 0 0 1 5 12v-2' }),
                  h('path', { d: 'M12 19v3' }),
                ]),
        toolbox: h('svg', { class: 'zhs-icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
                  h('path', { d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' }),
                ]),
      };

      return function() {
        var children = [];

        // 功能开关
        state.features.forEach(function(f) {
          children.push(h('div', { key: f.id, class: 'zhs-feature' }, [
            icons[f.icon],
            h('div', { class: 'zhs-feature-left' }, [
              h('span', { class: 'zhs-feature-label' }, f.label),
              h('span', { class: 'zhs-feature-desc' }, f.desc),
            ]),
            h('button', {
              class: 'zhs-feature-toggle' + (f.enabled ? ' is-on' : ''),
              onClick: function() { f.enabled = !f.enabled; },
            }, f.enabled ? '开' : '关'),
          ]));
        });

        return h('div', { class: 'zhs-settings' }, children);
      };
    },
  });

  ctx.css.inject([
    '.zhs-settings { display:flex; flex-direction:column; gap:6px; }',
    '.zhs-feature { display:flex; align-items:center; gap:8px; padding:8px 0; border-bottom:1px solid var(--border-color, rgba(128,128,128,0.15)); }',
    '.zhs-icon { width:18px; height:18px; flex-shrink:0; color:var(--color-text-secondary); }',
    '.zhs-feature-left { flex:1; display:flex; flex-direction:column; gap:2px; }',
    '.zhs-feature-label { font-size:13px; font-weight:600; color:var(--color-text-main); }',
    '.zhs-feature-desc { font-size:11px; color:var(--color-text-secondary); }',
    '.zhs-feature-toggle { padding:4px 16px; border-radius:12px; font-size:12px; font-weight:600; border:1px solid var(--border-color, rgba(128,128,128,0.3)); background:transparent; color:var(--color-text-secondary); cursor:pointer; transition:all 0.15s; }',
    '.zhs-feature-toggle.is-on { background:var(--color-primary); color:#fff; border-color:var(--color-primary); }',
  ].join(''));

  disposeSettings = ctx.ui.settings.define({
    id: 'zhangsan-toolkit',
    title: '张三工具集',
    description: '独立开关每个功能，改动即时生效',
    component: SettingsComp,
  });
}

export function deactivate() {
  stopArtistSort();
  stopHidePlaylist();
  stopLyricHide();
  stopHideRecognize();
  stopPluginBtn();

  if (disposeSettings) { disposeSettings(); disposeSettings = null; }
  ctx = null;
}
