/* ==========================================================================
   PortfolioForge — Static Portfolio Renderer
   Pure, dependency-free renderer: reads a Portfolio object (matching
   backend/models.py) and builds the DOM. Runs identically inside the
   live-preview iframe and inside the downloaded standalone file.
   ========================================================================== */

(function () {

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, val] of Object.entries(attrs)) {
      if (val === undefined || val === null || val === false) continue;
      if (key === 'class') node.className = val;
      else if (key === 'html') node.innerHTML = val;
      else node.setAttribute(key, val);
    }
    (Array.isArray(children) ? children : [children]).forEach(child => {
      if (child === undefined || child === null || child === '') return;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  function initials(name) {
    return (name || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('');
  }

  // -------------------------------------------------- section renderers

  function renderHero(sec) {
    return el('header', { class: 'pf-hero', id: 'hero' }, [
      el('div', { class: 'pf-hero__mark' }, initials(sec.name)),
      el('p', { class: 'pf-hero__eyebrow' }, sec.title || ''),
      el('h1', { class: 'pf-hero__name' }, sec.name || ''),
      sec.tagline ? el('p', { class: 'pf-hero__tagline' }, sec.tagline) : null,
      sec.summary ? el('p', { class: 'pf-hero__summary' }, sec.summary) : null,
    ]);
  }

  function renderExperience(sec) {
    const list = el('div', { class: 'pf-timeline' },
      (sec.items || []).map(item => el('div', { class: 'pf-timeline__item' }, [
        el('div', { class: 'pf-timeline__dot' }),
        el('div', { class: 'pf-timeline__content' }, [
          el('div', { class: 'pf-timeline__top' }, [
            el('h3', { class: 'pf-timeline__role' }, item.role || ''),
            el('span', { class: 'pf-timeline__dates' }, formatRange(item.start_date, item.end_date)),
          ]),
          el('p', { class: 'pf-timeline__company' }, item.company || ''),
          item.bullets && item.bullets.length
            ? el('ul', { class: 'pf-timeline__bullets' }, item.bullets.map(b => el('li', {}, b)))
            : null,
        ]),
      ]))
    );
    return sectionWrap(sec.heading || 'Experience', 'experience', [list]);
  }

  function renderSkills(sec) {
    const groups = {};
    (sec.skills || []).forEach(s => {
      const cat = s.category || 'Other';
      (groups[cat] = groups[cat] || []).push(s.name);
    });
    const groupEls = Object.entries(groups).map(([cat, names]) =>
      el('div', { class: 'pf-skill-group' }, [
        el('h4', { class: 'pf-skill-group__cat' }, cat),
        el('div', { class: 'pf-skill-group__pills' }, names.map(n => el('span', { class: 'pf-pill' }, n))),
      ])
    );
    return sectionWrap(sec.heading || 'Skills', 'skills', groupEls);
  }

  function renderProjects(sec) {
    const cards = (sec.items || []).map(item => el('article', { class: 'pf-card' }, [
      el('h3', { class: 'pf-card__title' }, item.title || ''),
      item.description ? el('p', { class: 'pf-card__desc' }, item.description) : null,
      item.tech_stack && item.tech_stack.length
        ? el('div', { class: 'pf-card__tags' }, item.tech_stack.map(t => el('span', { class: 'pf-tag-mono' }, t)))
        : null,
      el('div', { class: 'pf-card__links' }, [
        item.url ? el('a', { href: item.url, class: 'pf-card__link', target: '_blank', rel: 'noopener' }, 'Visit ↗') : null,
        item.github_url ? el('a', { href: item.github_url, class: 'pf-card__link', target: '_blank', rel: 'noopener' }, 'Code ↗') : null,
      ]),
    ]));
    return sectionWrap(sec.heading || 'Projects', 'projects', [el('div', { class: 'pf-grid' }, cards)]);
  }

  function renderEducation(sec) {
    const items = (sec.items || []).map(item => el('div', { class: 'pf-edu-item' }, [
      el('div', { class: 'pf-edu-item__top' }, [
        el('h3', { class: 'pf-edu-item__degree' }, [item.degree, item.field].filter(Boolean).join(', ')),
        el('span', { class: 'pf-timeline__dates' }, formatRange(item.start_date, item.end_date)),
      ]),
      el('p', { class: 'pf-edu-item__inst' }, item.institution || ''),
      item.honors ? el('p', { class: 'pf-edu-item__honors' }, item.honors) : null,
    ]));
    return sectionWrap(sec.heading || 'Education', 'education', items);
  }

  function renderCertificates(sec) {
    const items = (sec.items || []).map(item =>
      el(item.url ? 'a' : 'div', {
        class: 'pf-cert', href: item.url || undefined,
        target: item.url ? '_blank' : undefined, rel: item.url ? 'noopener' : undefined,
      }, [
        el('h4', { class: 'pf-cert__name' }, item.name || ''),
        el('p', { class: 'pf-cert__meta' }, [item.issuer, item.date].filter(Boolean).join(' · ')),
      ])
    );
    return sectionWrap(sec.heading || 'Certificates', 'certificates', [el('div', { class: 'pf-grid' }, items)]);
  }

  function renderSocials(sec) {
    const links = (sec.links || []).map(link => {
      const isPlaceholder = typeof link.url === 'string' && link.url.startsWith('PLACEHOLDER:');
      return el(isPlaceholder ? 'span' : 'a', {
        class: 'pf-social' + (isPlaceholder ? ' pf-social--placeholder' : ''),
        href: isPlaceholder ? undefined : link.url,
        target: isPlaceholder ? undefined : '_blank',
        rel: isPlaceholder ? undefined : 'noopener',
        title: isPlaceholder ? 'Link not found in resume — add your own' : undefined,
      }, `${link.platform}${isPlaceholder ? ' (add link)' : ''}`);
    });
    return sectionWrap(sec.heading || 'Socials', 'socials', [el('div', { class: 'pf-social-row' }, links)]);
  }

  function renderContact(sec) {
    const rows = [
      sec.email ? el('a', { class: 'pf-contact__row', href: `mailto:${sec.email}` }, sec.email) : null,
      sec.phone ? el('a', { class: 'pf-contact__row', href: `tel:${sec.phone}` }, sec.phone) : null,
      sec.location ? el('span', { class: 'pf-contact__row' }, sec.location) : null,
    ];
    return sectionWrap(sec.heading || 'Contact', 'contact', [el('div', { class: 'pf-contact' }, rows)]);
  }

  function renderCustom(sec) {
    const intro = sec.description ? el('p', { class: 'pf-section__intro' }, sec.description) : null;
    const cards = (sec.cards || []).map(card => el('article', { class: 'pf-card' }, [
      el('h3', { class: 'pf-card__title' }, card.title || ''),
      card.description ? el('p', { class: 'pf-card__desc' }, card.description) : null,
      card.details && card.details.length
        ? el('ul', { class: 'pf-timeline__bullets' }, card.details.map(d => el('li', {}, d)))
        : null,
    ]));
    return sectionWrap(sec.heading, slugify(sec.heading), [intro, el('div', { class: 'pf-grid' }, cards)]);
  }

  const RENDERERS = {
    hero: renderHero,
    experience: renderExperience,
    skills: renderSkills,
    projects: renderProjects,
    education: renderEducation,
    certificates: renderCertificates,
    socials: renderSocials,
    contact: renderContact,
    custom: renderCustom,
  };

  // -------------------------------------------------- shared helpers

  function sectionWrap(heading, id, children) {
    return el('section', { class: 'pf-section', id: slugify(id) }, [
      el('h2', { class: 'pf-section__heading' }, heading || ''),
      ...children,
    ]);
  }

  function slugify(str) {
    return (str || 'section').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function formatRange(start, end) {
    if (!start && !end) return '';
    return `${start || ''} — ${end || 'Present'}`;
  }

  function buildNav(sections) {
    const links = sections
      .filter(s => s.type !== 'hero')
      .map(s => el('a', { href: `#${slugify(s.type === 'custom' ? s.heading : s.type)}`, class: 'pf-nav__link' },
        s.heading || s.type));
    return el('nav', { class: 'pf-nav' }, [
      el('span', { class: 'pf-nav__brand' }, 'Portfolio'),
      el('div', { class: 'pf-nav__links' }, links),
    ]);
  }

  // -------------------------------------------------- entry point

  window.renderPortfolio = function renderPortfolio(portfolio) {
    const root = document.getElementById('portfolio-root');
    root.innerHTML = '';

    const sections = (portfolio && portfolio.sections) || [];
    if (!sections.length) {
      root.appendChild(el('p', { class: 'pf-empty' }, 'No sections to preview yet.'));
      return;
    }

    root.appendChild(buildNav(sections));

    sections.forEach(sec => {
      const renderer = RENDERERS[sec.type];
      if (!renderer) return;
      root.appendChild(renderer(sec));
    });

    root.appendChild(el('footer', { class: 'pf-footer' }, 'Built with PortfolioForge'));
  };

  // If data was injected directly (e.g. for static hosting after download
  // with a baked-in <script>window.PORTFOLIO_DATA=...</script>), render it.
  if (window.PORTFOLIO_DATA) {
    document.addEventListener('DOMContentLoaded', () => renderPortfolio(window.PORTFOLIO_DATA));
  }

})();
