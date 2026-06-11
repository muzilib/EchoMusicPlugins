let disposeSnapshot = null;
let observerRef = null;

function injectVinylStyles() {
  const old = document.getElementById('echo-vinyl-global-style');
  if (old) old.remove();
  
  const style = document.createElement('style');
  style.id = 'echo-vinyl-global-style';
  style.textContent = `
    .lyric-page .cover-wrapper,
    .lyric-page .cover-wrapper *,
    .lyric-page .cover-side,
    .lyric-page .cover-side *,
    .lyric-page .cover-container,
    .lyric-page .cover-container * {
      background: transparent !important;
      background-color: transparent !important;
      background-image: none !important;
      box-shadow: none !important;
      border: none !important;
      outline: none !important;
    }

    .lyric-page .cover-wrapper {
      overflow: visible !important;
      border-radius: 0 !important;
      width: 360px !important;
      height: 360px !important;
      min-width: 360px !important;
      min-height: 360px !important;
      padding: 0 !important;
      margin: 0 !important;
      position: relative !important;
      filter: none !important;
      --shadow-cover: none !important;
    }

    .lyric-page .cover-container {
      overflow: visible !important;
      position: relative !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 360px !important;
      height: 360px !important;
      min-width: 360px !important;
      min-height: 360px !important;
    }

    .lyric-page .cover-container::before,
    .lyric-page .cover-container::after {
      content: none !important;
      display: none !important;
    }

    .echo-vinyl-cover-wrap {
      width: 240px !important;
      height: 240px !important;
      border-radius: 50% !important;
      overflow: hidden !important;
      z-index: 2 !important;
      position: relative !important;
      animation: echoVinylSpin 20s linear infinite;
      animation-play-state: paused !important;
    }

    .echo-vinyl-cover-wrap img {
      width: 100% !important;
      height: 100% !important;
      border: none !important;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4) !important;
      object-fit: cover !important;
      display: block !important;
      border-radius: 50% !important;
    }

    .echo-vinyl-disc {
      position: absolute !important;
      width: 360px !important;
      height: 360px !important;
      border-radius: 50% !important;
      z-index: 1 !important;
      background: #141416 !important;
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.6),
        inset 0 0 100px rgba(0, 0, 0, 0.5);
      top: 0 !important;
      left: 0 !important;
      animation: echoVinylSpin 20s linear infinite;
      animation-play-state: paused !important;
    }

    .echo-vinyl-disc::before {
      content: '' !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      border-radius: 50% !important;
      background: 
        radial-gradient(circle, rgba(45,45,48,1) 0%, rgba(30,30,33,1) 40%, rgba(18,18,20,1) 100%),
        repeating-radial-gradient(circle at center, transparent 0px, rgba(70,70,73,0.12) 1px, transparent 2px, transparent 3px) !important;
    }

    .echo-vinyl-disc::after {
      content: '' !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      border-radius: 50% !important;
      background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.08) 100%) !important;
    }

    body.echo-vinyl-spinning .echo-vinyl-disc,
    body.echo-vinyl-spinning .echo-vinyl-cover-wrap {
      animation-play-state: running !important;
    }

    @keyframes echoVinylSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

function setupVinylElements() {
  const coverContainer = document.querySelector('.lyric-page .cover-container');
  if (!coverContainer) return;

  let parent = coverContainer;
  while (parent && parent !== document.body) {
    parent.style.setProperty('overflow', 'visible', 'important');
    parent = parent.parentElement;
  }

  coverContainer.style.cssText = 'background:transparent!important;background-color:transparent!important;background-image:none!important;box-shadow:none!important;border-radius:0!important;border:none!important;overflow:visible!important;position:relative!important;display:flex!important;align-items:center!important;justify-content:center!important;width:360px!important;height:360px!important;min-width:360px!important;min-height:360px!important;';
  
  // 彻底清除 cover-wrapper 的方形样式
  const coverWrapper = document.querySelector('.lyric-page .cover-wrapper');
  if (coverWrapper) {
    coverWrapper.className = '';
    coverWrapper.style.cssText = 'background:transparent!important;background-color:transparent!important;background-image:none!important;box-shadow:none!important;overflow:visible!important;border-radius:0!important;width:360px!important;height:360px!important;min-width:360px!important;min-height:360px!important;border:none!important;padding:0!important;margin:0!important;position:relative!important;outline:none!important;filter:none!important;';
    
    coverWrapper.querySelectorAll('*:not(.echo-vinyl-disc):not(.echo-vinyl-cover-wrap)').forEach(el => {
      el.style.background = 'transparent';
      el.style.backgroundColor = 'transparent';
      el.style.backgroundImage = 'none';
      el.style.boxShadow = 'none';
      el.style.border = 'none';
      el.style.outline = 'none';
    });
    
    let pw = coverWrapper.parentElement;
    while (pw && pw !== document.body) {
      pw.style.setProperty('overflow', 'visible', 'important');
      pw = pw.parentElement;
    }
  }
  
  const coverSide = document.querySelector('.lyric-page .cover-side');
  if (coverSide) {
    coverSide.style.background = 'transparent';
    coverSide.style.backgroundColor = 'transparent';
    coverSide.style.boxShadow = 'none';
    coverSide.style.border = 'none';
  }
  
  coverContainer.querySelectorAll('*:not(.echo-vinyl-disc):not(.echo-vinyl-cover-wrap)').forEach(el => {
    el.style.background = 'transparent';
    el.style.backgroundColor = 'transparent';
    el.style.backgroundImage = 'none';
    el.style.boxShadow = 'none';
    el.style.border = 'none';
    el.style.overflow = 'visible';
  });

  let coverWrap = coverContainer.querySelector('.echo-vinyl-cover-wrap');
  if (!coverWrap) {
    coverWrap = document.createElement('div');
    coverWrap.className = 'echo-vinyl-cover-wrap';
  }
  coverWrap.style.width = '240px';
  coverWrap.style.height = '240px';
  coverWrap.style.borderRadius = '50%';
  coverWrap.style.overflow = 'hidden';
  coverWrap.style.zIndex = '2';
  coverWrap.style.position = 'relative';

  const imgs = coverContainer.querySelectorAll('img');
  imgs.forEach(img => {
    if (img.parentElement !== coverWrap) {
      coverWrap.appendChild(img);
    }
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.border = 'none';
    img.style.borderRadius = '50%';
    img.style.objectFit = 'cover';
    img.style.display = 'block';
  });

  if (!coverContainer.querySelector('.echo-vinyl-disc')) {
    const disc = document.createElement('div');
    disc.className = 'echo-vinyl-disc';
    coverContainer.appendChild(disc);
  }
  if (!coverContainer.contains(coverWrap)) {
    coverContainer.appendChild(coverWrap);
  }
}

function updatePlayState(isPlaying) {
  if (isPlaying) {
    document.body.classList.add('echo-vinyl-spinning');
  } else {
    document.body.classList.remove('echo-vinyl-spinning');
  }
}

export function activate(ctx) {
  document.querySelectorAll('.echo-vinyl-disc, .echo-vinyl-cover-wrap').forEach(el => el.remove());
  
  injectVinylStyles();
  setupVinylElements();

  if (ctx && ctx.player) {
    try {
      updatePlayState(ctx.player.isPlaying?.value);
      if (ctx.vue && ctx.vue.watch) {
        ctx.vue.watch(ctx.player.isPlaying, (val) => {
          updatePlayState(val);
        });
      }
    } catch(e) {}
  }

  if (ctx && ctx.nowPlaying) {
    ctx.nowPlaying.getSnapshot().then((snapshot) => {
      updatePlayState(snapshot?.playback?.isPlaying);
    }).catch(() => {});

    disposeSnapshot = ctx.nowPlaying.onSnapshot((snapshot) => {
      updatePlayState(snapshot?.playback?.isPlaying);
    });
  }

  observerRef = new MutationObserver(() => {
    setupVinylElements();
  });
  observerRef.observe(document.body, { childList: true, subtree: true });
}

export function deactivate(ctx) {
  if (disposeSnapshot) {
    try { disposeSnapshot(); } catch(e) {}
  }
  if (observerRef) observerRef.disconnect();
  
  document.getElementById('echo-vinyl-global-style')?.remove();
  document.body.classList.remove('echo-vinyl-spinning');
  document.querySelectorAll('.echo-vinyl-disc, .echo-vinyl-cover-wrap').forEach(el => el.remove());
  
  const c = document.querySelector('.lyric-page .cover-container');
  if (c) {
    c.style.cssText = '';
    c.querySelectorAll('*').forEach(el => { el.style.cssText = ''; });
  }
}
