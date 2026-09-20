/* Live layer for the portfolio.
 *
 * Everything here is progressive enhancement: the page ships with real content
 * already in the HTML, and this only replaces it when the GitHub API answers.
 * Unauthenticated calls are limited to 60/hour per visitor IP, so a miss is
 * normal and must never leave the page worse than it started.
 */
(() => {
  'use strict';

  const USER = 'cybersamarth';
  // Repos that shouldn't appear on the site, whatever the API returns.
  const HIDE = new Set([USER, 'OpenEASD', 'cybersamarth.github.io', 'Readme',
                        'the-book-of-secret-knowledge']);
  const MAX_REPOS = 6;
  // Some repos carry no description on GitHub; these keep the cards readable.
  const DESC = {
    Keylogger: 'A deliberately minimal Linux keylogger in Node.js — no external modules, ' +
               'built on events and fs.createReadStream.',
    SecScraper: 'Scraping utility built for security research and intelligence-gathering workflows.',
  };
  const CAREER_START = new Date('2022-02-01');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* --- year in the footer --- */
  const yr = $('#yr');
  if (yr) yr.textContent = new Date().getFullYear();

  /* --- years in security, so it never goes stale --- */
  const years = $('[data-stat="years"]');
  if (years) {
    const diff = (Date.now() - CAREER_START) / (365.25 * 24 * 3600 * 1000);
    years.dataset.target = String(Math.max(1, Math.floor(diff)));
  }

  /* --- rotating role line --- */
  const role = $('#role');
  if (role && !reduced) {
    const words = (role.dataset.words || '').split('|').filter(Boolean);
    if (words.length > 1) {
      let wi = 0, ci = 0, deleting = false;
      role.textContent = '';
      role.classList.add('typed');
      const tick = () => {
        const word = words[wi];
        ci += deleting ? -1 : 1;
        role.textContent = word.slice(0, ci);
        let wait = deleting ? 34 : 62;
        if (!deleting && ci === word.length) { wait = 2100; deleting = true; }
        else if (deleting && ci === 0) { deleting = false; wi = (wi + 1) % words.length; wait = 340; }
        setTimeout(tick, wait);
      };
      setTimeout(tick, 900);
    }
  }

  /* --- count up a number once it matters --- */
  const countUp = (el, target) => {
    if (reduced || target <= 0) { el.textContent = String(target); return; }
    const dur = 900, t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* --- reveal on scroll --- */
  const reveals = $$('.reveal');
  if (reveals.length && 'IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }

  /* --- stat tiles animate when the hero is seen --- */
  const animateStats = () => {
    $$('.stat .n').forEach((el) => {
      const target = Number(el.dataset.target ?? el.textContent.trim());
      if (Number.isFinite(target)) countUp(el, target);
    });
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries, obs) => {
      if (entries.some((e) => e.isIntersecting)) { animateStats(); obs.disconnect(); }
    }, { threshold: 0.2 });
    const stats = $('.stats');
    if (stats) io.observe(stats);
  } else {
    animateStats();
  }

  /* --- pointer glow on cards --- */
  if (matchMedia('(hover: hover)').matches) {
    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest?.('.card');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { passive: true });
  }

  /* --- live data --- */
  const ago = (iso) => {
    const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const json = async (url) => {
    const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  };

  const renderRepos = (repos) => {
    const host = $('#repos');
    if (!host || !repos.length) return;
    host.innerHTML = repos.map((r) => {
      const meta = [
        r.language ? `<span>${esc(r.language)}</span>` : '',
        r.stargazers_count ? `<span class="star">★ ${r.stargazers_count}</span>` : '',
        `<span>updated ${esc(ago(r.pushed_at))}</span>`,
      ].filter(Boolean).join('');
      return `<div class="card">
        <h3><a href="${esc(r.html_url)}">${esc(r.name)}</a></h3>
        <p>${esc(r.description || DESC[r.name] || 'No description yet.')}</p>
        <div class="meta">${meta}</div>
      </div>`;
    }).join('');
  };

  const setStat = (key, value) => {
    const el = $(`[data-stat="${key}"]`);
    if (el && Number.isFinite(value)) countUp(el, value);
  };

  (async () => {
    try {
      const [user, repos] = await Promise.all([
        json(`https://api.github.com/users/${USER}`),
        json(`https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`),
      ]);

      const visible = repos
        .filter((r) => !r.private && !HIDE.has(r.name))
        .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
      renderRepos(visible.slice(0, MAX_REPOS));

      setStat('repos', user.public_repos);
      setStat('stars', repos.reduce((n, r) => n + (r.stargazers_count || 0), 0));
    } catch (err) {
      // Rate limited or offline — the page already has real content. Leave it.
      console.info('[site] live data unavailable, using baked-in content:', err.message);
    }
  })();
})();
