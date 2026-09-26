/* ============================================================
   Гид по городам — логика интерфейса
   ============================================================ */
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = { city: null, dir: null, cat: null };

  const el = {
    citiesGrid: $('#citiesGrid'),
    heroIndex: $('#heroIndex'),
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

  const num = i => String(i + 1).padStart(2, '0');

  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  function countPlaces(city) {
    return DIRECTION_ORDER.reduce((sum, d) => {
      if (!city.directions[d]) return sum;
      return sum + CATEGORY_ORDER.reduce((n, k) => {
        const cat = city.directions[d].categories[k];
        if (!cat) return n;
        return n + cat.places.length + (cat.bonus ? 1 : 0);
      }, 0);
    }, 0);
  }

  const totalPlaces = () => CITIES.reduce((sum, c) => sum + countPlaces(c), 0);

  /* ---------- Индекс городов в hero ---------- */
  function renderHeroIndex() {
    el.heroIndex.innerHTML = CITIES.map((c, i) => `
      <button class="hi-row" data-city="${c.id}">
        <span class="hi-row__num">${num(i)}</span>
        <span class="hi-row__name">${c.name}</span>
        <span class="hi-row__count">${countPlaces(c)}</span>
        <span class="hi-row__arrow" aria-hidden="true">→</span>
      </button>
    `).join('');
  }

  /* ---------- Города (список) ---------- */
  function renderCities() {
    el.citiesGrid.innerHTML = CITIES.map((c, i) => `
      <article class="city reveal" role="button" tabindex="0" data-city="${c.id}"
        aria-label="Смотреть места в городе ${c.name}" style="transition-delay:${i * 70}ms">
        <span class="city__index">${num(i)}</span>
        <div>
          <h3 class="city__name">${c.name} <span class="city__emoji" aria-hidden="true">${c.emoji}</span></h3>
          <p class="city__sub">${c.tagline}</p>
        </div>
        <ul class="city__facts">
          ${c.facts.slice(0, 2).map(f => `<li class="city__fact">${f}</li>`).join('')}
        </ul>
        <p class="city__about">${c.about}</p>
        <span class="city__go">Смотреть места <i aria-hidden="true">→</i></span>
      </article>
    `).join('');
    observeReveal();
  }

  /* ---------- Направления ---------- */
  function renderDirections(city) {
    el.levelsDir.innerHTML = DIRECTION_ORDER.filter(k => city.directions[k]).map((key, i) => {
      const d = city.directions[key];
      const count = CATEGORY_ORDER.filter(k => d.categories[k])
        .reduce((n, k) => n + d.categories[k].places.length + (d.categories[k].bonus ? 1 : 0), 0);
      return `
        <button class="seg__btn" data-dir="${key}" style="transition-delay:${i * 60}ms">
          <span class="seg__icon" aria-hidden="true">${d.emoji}</span>
          <span>
            <span class="seg__label">${d.label}</span>
            <span class="seg__sub">${d.hint}</span>
          </span>
          <span class="seg__count">${count}</span>
        </button>`;
    }).join('');
    el.levelsDir.hidden = false;
  }

  /* ---------- Категории ---------- */
  function renderCategories(city, dirKey) {
    const dir = city.directions[dirKey];
    el.levelsCat.innerHTML = CATEGORY_ORDER.filter(k => dir.categories[k]).map((key, i) => {
      const c = dir.categories[key];
      const count = c.places.length + (c.bonus ? 1 : 0);
      return `
        <button class="seg__btn" data-cat="${key}" style="transition-delay:${i * 60}ms">
          <span class="seg__icon" aria-hidden="true">${c.emoji}</span>
          <span>
            <span class="seg__label">${c.label}</span>
            <span class="seg__sub">${count} ${plural(count, 'место', 'места', 'мест')}</span>
          </span>
          <span class="seg__count">${String.fromCharCode(65 + i)}</span>
        </button>`;
    }).join('');
    el.levelsCat.hidden = false;
  }

  /* ---------- Карточка места ---------- */
  function placeCard(place, ctx, isBonus) {
    const free = place.price.toLowerCase().indexOf('бесплатно') > -1;
    return `
      <article class="place${isBonus ? ' place--bonus' : ''}">
        ${isBonus ? '<span class="place__flag">Бонус</span>' : ''}
        <div class="place__head">
          <span class="place__icon" aria-hidden="true">${place.emoji}</span>
          <div>
            <h3 class="place__name">${place.name}</h3>
            <p class="place__cat">${ctx.city.name} · ${ctx.cat.label}</p>
          </div>
        </div>
        <dl class="spec">
          <div class="spec__row"><dt>Адрес</dt><dd>${place.address}</dd></div>
          <div class="spec__row"><dt>Чек</dt><dd class="${free ? 'is-free' : ''}">${place.price}</dd></div>
        </dl>
        <p class="place__desc">${place.desc}</p>
        <ul class="place__tags">${place.tags.map(t => `<li class="place__tag">${t}</li>`).join('')}</ul>
        <a class="place__map" href="${mapUrl(place.name, ctx.city.name)}" target="_blank" rel="noopener">
          Открыть на карте <i aria-hidden="true">↗</i>
        </a>
      </article>`;
  }

  function renderPlaces(city, dirKey, catKey) {
    const cat = city.directions[dirKey].categories[catKey];
    const ctx = { city, dir: city.directions[dirKey], cat };
    const cards = cat.places.map(p => placeCard(p, ctx, false)).join('') +
      (cat.bonus ? placeCard(cat.bonus, ctx, true) : '');
    el.placesGrid.innerHTML = cards;
    $$('.place', el.placesGrid).forEach((node, i) => {
      node.style.animationDelay = i * 45 + 'ms';
    });
  }

  /* ---------- Шаги ---------- */
  function selectCity(id, opts) {
    const city = CITIES.find(c => c.id === id);
    if (!city) return;
    state.city = city;
    state.dir = null;
    state.cat = null;

    markActiveCity(id);

    el.chipCity.textContent = city.name;
    el.explorerTop.hidden = false;
    el.explorerHead.hidden = false;
    el.explorerKicker.textContent = 'Шаг 02 — ' + city.name;
    el.explorerTitle.textContent = 'Куда сходим?';
    el.explorerSub.textContent = 'Выберите направление — с детьми или взрослым.';

    renderDirections(city);
    el.levelsCat.hidden = true;
    el.levelsCat.innerHTML = '';
    el.placesGrid.innerHTML = '';

    if (!opts || opts.scroll !== false) {
      setTimeout(() => el.explorer.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }
  }

  function selectDir(key) {
    const city = state.city;
    if (!city) return;
    state.dir = key;
    state.cat = null;

    $$('.seg__btn', el.levelsDir).forEach(b => b.classList.toggle('is-active', b.dataset.dir === key));

    el.explorerKicker.textContent = 'Шаг 03 — ' + city.directions[key].label;
    el.explorerTitle.textContent = 'Рестораны или развлечения?';
    el.explorerSub.textContent = city.directions[key].hint + '.';

    renderCategories(city, key);
    el.placesGrid.innerHTML = '';
  }

  function selectCat(key) {
    const city = state.city;
    if (!city || !state.dir) return;
    state.cat = key;

    $$('.seg__btn', el.levelsCat).forEach(b => b.classList.toggle('is-active', b.dataset.cat === key));

    const cat = city.directions[state.dir].categories[key];
    el.explorerKicker.textContent = 'Шаг 04 — ' + cat.label;
    el.explorerTitle.textContent = city.name + ', ' + cat.label.toLowerCase();
    el.explorerSub.textContent = 'С направлением «' + city.directions[state.dir].label + '» — ' +
      cat.places.length + ' ' + plural(cat.places.length, 'место', 'места', 'мест') +
      ': адрес, средний чек и короткое описание.' +
      (cat.bonus ? ' Плюс одно бонусное место.' : '');

    renderPlaces(city, state.dir, key);
    updateQuery();
  }

  function markActiveCity(id) {
    $$('.city', el.citiesGrid).forEach(n => n.classList.toggle('is-active', n.dataset.city === id));
    $$('.hi-row', el.heroIndex).forEach(n => n.classList.toggle('is-active', n.dataset.city === id));
  }

  function reset() {
    state.city = state.dir = state.cat = null;
    el.explorerTop.hidden = true;
    el.explorerHead.hidden = true;
    el.levelsDir.hidden = true;
    el.levelsDir.innerHTML = '';
    el.levelsCat.hidden = true;
    el.levelsCat.innerHTML = '';
    el.placesGrid.innerHTML = '';
    markActiveCity(null);
    try {
      if (new URLSearchParams(location.search).has('city')) {
        history.replaceState(null, '', location.pathname);
      }
    } catch (err) { /* file:// */ }
    document.getElementById('cities').scrollIntoView({ behavior: 'smooth' });
  }

  /* ---------- Ссылка состояния ?city=&dir=&cat= ---------- */
  function updateQuery() {
    if (!state.city) return;
    try {
      const p = new URLSearchParams({ city: state.city.id });
      if (state.dir) p.set('dir', state.dir);
      if (state.cat) p.set('cat', state.cat);
      history.replaceState(null, '', location.pathname + '?' + p.toString());
    } catch (err) { /* file:// */ }
  }

  function restoreFromQuery() {
    const p = new URLSearchParams(location.search);
    const cityId = p.get('city');
    if (!cityId) return;
    selectCity(cityId, { scroll: false });
    if (p.get('dir') && state.city.directions[p.get('dir')]) selectDir(p.get('dir'));
    if (state.dir && p.get('cat') && state.city.directions[state.dir].categories[p.get('cat')]) {
      selectCat(p.get('cat'));
    }
  }

  /* ---------- Появление при скролле ---------- */
  let io = null;
  function observeReveal() {
    if (!('IntersectionObserver' in window)) {
      $$('.reveal').forEach(n => n.classList.add('is-in'));
      return;
    }
    if (!io) {
      io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    }
    $$('.reveal:not(.is-in)').forEach(n => io.observe(n));
  }

  /* ---------- Счётчики ---------- */
  function initCounters() {
    const nodes = $$('[data-metric]');
    if (!nodes.length) return;
    const run = node => {
      const target = Number(node.dataset.count) || 0;
      const t0 = performance.now(), dur = 900;
      const step = now => {
        const p = Math.min(1, (now - t0) / dur);
        node.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (!('IntersectionObserver' in window)) { nodes.forEach(run); return; }
    const co = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { run(e.target); co.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    nodes.forEach(n => co.observe(n));
    setTimeout(() => co.disconnect(), 1500);
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

    el.heroIndex.addEventListener('click', e => {
      const row = e.target.closest('.hi-row');
      if (row) selectCity(row.dataset.city);
    });

    el.levelsDir.addEventListener('click', e => {
      const b = e.target.closest('.seg__btn');
      if (b) selectDir(b.dataset.dir);
    });

    el.levelsCat.addEventListener('click', e => {
      const b = e.target.closest('.seg__btn');
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
      el.header.classList.toggle('is-stuck', y > 8);
      el.toTop.classList.toggle('is-visible', y > 700);
    }, { passive: true });

    el.toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ---------- Старт ---------- */
  function init() {
    $$('[data-metric]').forEach(node => {
      const value = node.dataset.metric === 'cities' ? CITIES.length : totalPlaces();
      node.dataset.count = value;
      node.textContent = value;
    });

    renderHeroIndex();
    renderCities();
    bind();
    initCounters();
    observeReveal();
    restoreFromQuery();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
