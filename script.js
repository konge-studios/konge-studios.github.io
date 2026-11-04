/* Konge Studios — mobile menu + multi-image carousel lightbox. Vanilla JS, no dependencies.
   Any element with data-images="a.jpg,b.jpg" (or the older data-full="a.jpg") opens the carousel.
   The first image in the list shows instantly. The rest are checked in the background,
   and any file that is missing is skipped, so a wrong filename never shows a broken image. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);

  /* ---- Mobile navigation ---- */
  const burger = $('.burger'), menu = $('.menu');
  const setMenu = open => {
    menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
  };
  burger?.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  menu?.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });

  /* ---- Footer year ---- */
  const yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();

  /* ---- Lightbox carousel ---- */
  const lb = document.createElement('div');
  lb.className = 'lb';
  lb.hidden = true;
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Mirror gallery');
  lb.innerHTML =
    '<button class="lb-x" aria-label="Close">&times;</button>' +
    '<div class="lb-stage">' +
      '<button class="lb-prev" aria-label="Previous image">&#10094;</button>' +
      '<img alt="">' +
      '<button class="lb-next" aria-label="Next image">&#10095;</button>' +
    '</div>' +
    '<div class="lb-meta">' +
      '<p class="lb-cap"></p><p class="lb-desc"></p><p class="lb-count" aria-live="polite"></p>' +
    '</div>';
  document.body.append(lb);

  const img = $('img', lb), cap = $('.lb-cap', lb), desc = $('.lb-desc', lb),
        count = $('.lb-count', lb), closeBtn = $('.lb-x', lb),
        prevBtn = $('.lb-prev', lb), nextBtn = $('.lb-next', lb), stage = $('.lb-stage', lb);

  let images = [], idx = 0, name = '', opener = null, touchX = 0, token = 0;
  const okCache = new Map(); // src -> Promise<boolean>

  /* Resolves true if the image loads, false if the file is missing */
  const probe = src => {
    if (!okCache.has(src)) {
      okCache.set(src, new Promise(res => {
        const p = new Image();
        p.onload = () => res(true);
        p.onerror = () => res(false);
        p.src = src;
      }));
    }
    return okCache.get(src);
  };

  const show = i => {
    if (!images.length) return;
    idx = (i + images.length) % images.length;
    img.src = images[idx];
    img.alt = images.length > 1 ? `${name}, photo ${idx + 1} of ${images.length}` : name;
    count.textContent = images.length > 1 ? `${idx + 1} / ${images.length}` : '';
    const multi = images.length > 1;
    prevBtn.hidden = nextBtn.hidden = !multi;
    if (multi) { // warm the neighbours so swiping feels instant
      probe(images[(idx + 1) % images.length]);
      probe(images[(idx - 1 + images.length) % images.length]);
    }
  };

  const open = el => {
    opener = el;
    const list = (el.dataset.images || el.dataset.full || '')
      .split(',').map(s => s.trim()).filter(Boolean);
    if (!list.length) return;
    const mine = ++token;
    name = el.dataset.name || '';
    cap.textContent = name;
    desc.textContent = el.dataset.desc || '';
    images = [list[0]];              // first image straight away
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => lb.classList.add('on')); // lets the fade-in run
    show(0);
    closeBtn.focus();

    // Then add the others, in order, skipping any that do not exist
    Promise.all(list.slice(1).map(probe)).then(results => {
      if (mine !== token || lb.hidden) return;   // closed or reopened meanwhile
      const extra = list.slice(1).filter((_, k) => results[k]);
      if (!extra.length) return;
      const current = images[idx];
      images = [list[0], ...extra];
      idx = Math.max(0, images.indexOf(current));
      show(idx);
    });
  };

  const close = () => {
    token++;
    lb.classList.remove('on');
    document.body.style.overflow = '';
    setTimeout(() => { if (!lb.classList.contains('on')) { lb.hidden = true; img.removeAttribute('src'); } }, 250);
    opener?.focus();
  };

  document.addEventListener('click', e => {
    if (!lb.hidden && lb.contains(e.target)) {
      if (e.target.closest('.lb-prev')) show(idx - 1);
      else if (e.target.closest('.lb-next')) show(idx + 1);
      else if (e.target === lb || e.target === stage || e.target.closest('.lb-x')) close();
      return;
    }
    const t = e.target.closest('[data-images],[data-full]');
    if (t) open(t);
  });

  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(idx - 1);
    else if (e.key === 'ArrowRight') show(idx + 1);
    else if (e.key === 'Tab') { // keep focus inside the dialog
      e.preventDefault();
      const f = [closeBtn, prevBtn, nextBtn].filter(b => !b.hidden);
      const i = f.indexOf(document.activeElement);
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });

  /* Swipe on touch screens */
  stage.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40 && images.length > 1) show(idx + (dx < 0 ? 1 : -1));
  }, { passive: true });
})();
