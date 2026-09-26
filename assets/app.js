/* ============================================================
   Гид по городам — логика интерфейса
   ============================================================ */
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = {
    city: null,
    dir: null,
    cat: null
  };

  const el = {
    citiesGrid: $('#citiesGrid'),
    explorer: $('#places'),
    explorerTop: $('#explorerTop'),
    explorerHead: $('#explorerHead'),
    explorerKicker: $('#explorerKicker'),
    explorerTitle: $('#explorerTitle'),
    explorerSub: $('#explorerSub'),
    chipCity: $('#chipCity'),
    levelsDir: $('#levelDirs'),
    levelsCat: $('#levelCats'),
    placesGrid: $('#placesGrid'),
    resetBtn: $('#resetBtn'),
    nav: $('#nav'),
    burger: $('#burger'),
    toTop: $('#toTop'),
    header: $('.header')
  };

  const mapUrl = (name, city) =>
    'https://yandex.ru/maps/?text=' + encodeURIComponent(city + ', ' + name);

  /* ---------- Рендер городов ---------- */
  function renderCities() {
    el.citiesGrid.innerHTML = CITIES.map((c, i) => `
      <article class="city reveal" role="button" tabindex="0" data-city="${c.id}" aria-label="Смотреть места в городе ${c.name}" style="--c1:${c.gradient[0]};--c2:${c.gradient[1]};--accent:${c.accent};transition-delay:${i * 90}ms">
        <div class="city__cover">
          <span class="city__tag">${c.tagline}</span>
          <span class="city__emoji">${c.emoji}</span>
        </div>
        <div class="city__body">
          <h3 class="city__name">${c.name}</h3>
          <p class="city__about">${c.about}</p>
          <div class="city__facts">
            ${c.facts.map(f => `<span class="city__fact">${f}</span>`).join('')}
          </div>
          <span class="city__go">Смотреть места <span>→</span></span>
        </div>
      </article>
    `).join('');
    observeReveal();
  }

  /* ---------- Рендер направлений ---------- */
  function renderDirections(city) {
    el.levelsDir.innerHTML = DIRECTION_ORDER.filter(k => city.directions[k]).map((key, i) => {
      const d = city.directions[key];
      return `
        <button class="level__btn reveal" data-dir="${key}" style="--c1:${city.gradient[0]};--c2:${city.gradient[1]};transition-delay:${i * 80}ms">
          <span class="level__ico">${d.emoji}</span>
          <span class="level__txt">${d.label}<small>${d.hint}</small></span>
        </button>
      `;
    }).join('');
    el.levelsDir.hidden = false;
    observeReveal();
  }

  /* ---------- Рендер категорий ---------- */
  function renderCategories(city, dirKey) {
    const dir = city.directions[dirKey];
    const keys = CATEGORY_ORDER.filter(k => dir.categories[k]);
    el.levelsCat.innerHTML = keys.map((key, i) => {
      const c = dir.categories[key];
      const count = c.places.length + (c.bonus ? 1 : 0);
      return `
        <button class="level__btn reveal" data-cat="${key}" style="--c1:${city.gradient[0]};--c2:${city.gradient[1]};transition-delay:${i * 80}ms">
          <span class="level__ico">${c.emoji}</span>
          <span class="level__txt">${c.label}<small>${count} ${plural(count, 'место', 'места', 'мест')}</small></span>
        </button>
      `;
    }).join('');
    el.levelsCat.hidden = false;
    observeReveal();
  }

  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  /* ---------- Рендер мест ---------- */
  function placeCard(place, city, isBonus) {
    const price = place.price.toLowerCase().indexOf('бесплатно') > -1;
    return `
      <article class="place${isBonus ? ' place--bonus' : ''}" style="animation-delay:${isBonus ? 120 : 0}ms">
        ${isBonus ? '<span class="place__flag">Бонус</span>' : ''}
        <div class="place__top">
          <span class="place__emoji">${place.emoji}</span>
          <span class="place__price${price ? ' place__price--free' : ''}">${place.price}</span>
        </div>
        <h3 class="place__name">${place.name}</h3>
        <p class="place__addr"><span>📍</span><span>${place.address}</span></p>
        <p class="place__desc">${place.desc}</p>
        <div class="place__tags">${place.tags.map(t => `<span class="place__tag">${t}</span>`).join('')}</div>
        <a class="place__map" href="${mapUrl(place.name, city.name)}" target="_blank" rel="noopener">Открыть на карте 🗺️</a>
      </article>
    `;
  }

  function renderPlaces(city, dirKey, catKey) {
    const cat = city.directions[dirKey].categories[catKey];
    const cards = cat.places.map(p => placeCard(p, city, false)).join('');
    const bonus = cat.bonus ? placeCard(cat.bonus, city, true) : '';
    el.placesGrid.innerHTML = cards + bonus;
    $$('.place', el.placesGrid).forEach((node, i) => {
      node.style.animationDelay = i * 70 + 'ms';
    });
  }

  /* ---------- Навигация по шагам ---------- */
  function selectCity(id, opts) {
    const city = CITIES.find(c => c.id === id);
    if (!city) return;
    state.city = city;
    state.dir = null;
    state.cat = null;

    $$('.city', el.citiesGrid).forEach(b => b.classList.toggle('is-active', b.dataset.city === id));

    el.chipCity.textContent = city.emoji + ' ' + city.name;
    el.explorerTop.hidden = false;
    el.explorerHead.hidden = false;
    el.explorerKicker.textContent = 'Шаг 2 · ' + city.name;
    el.explorerTitle.textContent = 'Куда сходим?';
    el.explorerSub.textContent = 'Выберите направление — с детьми или взрослым.';

    renderDirections(city);
    el.levelsCat.hidden = true;
    el.levelsCat.innerHTML = '';
    el.placesGrid.innerHTML = '';
    $('.steps-label').textContent = 'Выберите направление';

    if (!opts || opts.scroll !== false) scrollToExplorer();
  }

  function selectDir(key) {
    const city = state.city;
    if (!city) return;
    state.dir = key;
    state.cat = null;

    $$('.level__btn', el.levelsDir).forEach(b => b.classList.toggle('is-active', b.dataset.dir === key));

    el.explorerTitle.textContent = city.directions[key].label + ': что выбрать?';
    el.explorerSub.textContent = city.directions[key].hint + '. Дальше — рестораны или развлечения.';
    $('.steps-label').textContent = 'Шаг 3 · выберите категорию';

    renderCategories(city, key);
    el.placesGrid.innerHTML = '';
  }

  function selectCat(key) {
    const city = state.city;
    if (!city || !state.dir) return;
    state.cat = key;

    $$('.level__btn', el.levelsCat).forEach(b => b.classList.toggle('is-active', b.dataset.cat === key));

    const cat = city.directions[state.dir].categories[key];
    const dir = city.directions[state.dir];
    el.explorerTitle.textContent = dir.label + ' · ' + cat.label;
    el.explorerSub.textContent = city.name + ': ' + cat.places.length + ' ' +
      plural(cat.places.length, 'место', 'места', 'мест') + ' с описанием, адресом и средним чеком.' +
      (cat.bonus ? ' Плюс одно бонусное место.' : '');
    $('.steps-label').textContent = 'Готово · ' + cat.label;

    renderPlaces(city, state.dir, key);
    updateHash();
  }

  function reset() {
    state.city = null; state.dir = null; state.cat = null;
    el.explorerTop.hidden = true;
    el.explorerHead.hidden = true;
    el.levelsDir.hidden = true;
    el.levelsDir.innerHTML = '';
    el.levelsCat.hidden = true;
    el.levelsCat.innerHTML = '';
    el.placesGrid.innerHTML = '';
    $$('.city', el.citiesGrid).forEach(b => b.classList.remove('is-active'));
    if (location.hash.includes('city=')) {
      try { history.replaceState(null, '', location.pathname + location.search); } catch (err) { /* file:// */ }
    }
    document.getElementById('cities').scrollIntoView({ behavior: 'smooth' });
  }

  function scrollToExplorer() {
    setTimeout(() => {
      el.explorer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }

  /* ---------- Ссылки вида ?city=voronezh&dir=kids&cat=fun ---------- */
  function updateHash() {
    if (!state.city) return;
    try {
      const p = new URLSearchParams({ city: state.city.id });
      if (state.dir) p.set('dir', state.dir);
      if (state.cat) p.set('cat', state.cat);
      history.replaceState(null, '', location.pathname + '?' + p.toString());
    } catch (err) {
      /* локальный просмотр через file:// — просто пропускаем */
    }
  }

  function restoreFromQuery() {
    const p = new URLSearchParams(location.search);
    const city = p.get('city');
    if (!city) return false;
    selectCity(city, { scroll: false });
    if (p.get('dir')) selectDir(p.get('dir'));
    if (state.dir && p.get('cat')) selectCat(p.get('cat'));
    return true;
  }

  /* ---------- Появление при скролле ---------- */
  let io = null;
  function observeReveal() {
    if (!('IntersectionObserver' in window)) {
      $$('.reveal').forEach(n => n.classList.add('is-in'));
      return;
    }
    if (!io) {
      io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    }
    $$('.reveal:not(.is-in)').forEach(n => io.observe(n));
  }

  /* ---------- Счётчики ---------- */
  function initCounters() {
    const nodes = $$('[data-count]');
    if (!nodes.length) return;
    const start = () => nodes.forEach(node => {
      const target = Number(node.dataset.count);
      const t0 = performance.now(), dur = 1200;
      const step = now => {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        node.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    if (!('IntersectionObserver' in window)) return start();
    const co = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (e.isIntersecting) { start(); obs.disconnect(); }
      });
    }, { threshold: 0.4 });
    co.observe(nodes[0]);
  }

  /* ---------- Слушатели ---------- */
  function bind() {
    el.citiesGrid.addEventListener('click', e => {
      const card = e.target.closest('.city');
      if (card) selectCity(card.dataset.city);
    });

    el.citiesGrid.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.city');
      if (!card) return;
      e.preventDefault();
      selectCity(card.dataset.city);
    });

    el.levelsDir.addEventListener('click', e => {
      const b = e.target.closest('.level__btn');
      if (b) selectDir(b.dataset.dir);
    });

    el.levelsCat.addEventListener('click', e => {
      const b = e.target.closest('.level__btn');
      if (b) selectCat(b.dataset.cat);
    });

    el.resetBtn.addEventListener('click', reset);

    document.addEventListener('click', e => {
      const s = e.target.closest('[data-scroll]');
      if (!s) return;
      const t = document.querySelector(s.dataset.scroll);
      if (t) t.scrollIntoView({ behavior: 'smooth' });
    });

    $$('a[href="#places"]').forEach(a => a.addEventListener('click', e => {
      if (state.city) return;
      e.preventDefault();
      document.getElementById('cities').scrollIntoView({ behavior: 'smooth' });
    }));

    el.burger.addEventListener('click', () => {
      const open = el.nav.classList.toggle('is-open');
      el.burger.classList.toggle('is-open', open);
      el.burger.setAttribute('aria-expanded', String(open));
    });

    $$('.nav__link', el.nav).forEach(a => a.addEventListener('click', () => {
      el.nav.classList.remove('is-open');
      el.burger.classList.remove('is-open');
      el.burger.setAttribute('aria-expanded', 'false');
    }));

    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      el.header.classList.toggle('is-stuck', y > 10);
      el.toTop.classList.toggle('is-visible', y > 700);
    }, { passive: true });

    el.toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ---------- Старт ---------- */
  function init() {
    renderCities();
    bind();
    initCounters();
    observeReveal();

    const total = CITIES.reduce((sum, c) => {
      return sum + DIRECTION_ORDER.reduce((s, d) => {
        if (!c.directions[d]) return s;
        return s + CATEGORY_ORDER.reduce((n, k) => {
          if (!c.directions[d].categories[k]) return n;
          const cat = c.directions[d].categories[k];
          return n + cat.places.length + (cat.bonus ? 1 : 0);
        }, 0);
      }, 0);
    }, 0);

    const heroCityCount = $('#heroCityCount');
    const heroPlaceCount = $('#heroPlaceCount');
    if (heroCityCount) heroCityCount.textContent = CITIES.length;
    if (heroPlaceCount) heroPlaceCount.textContent = total;

    restoreFromQuery();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
