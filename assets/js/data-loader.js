/* ==========================================================================
   Signal Serif — Data Loader
   Hydrates the static template DOM from data/*.json (emitted by the
   platform mapper). Zero dependencies. If any file fails to load, the
   corresponding static markup is simply left as-is.

   Exposes:
     window.__DATA_READY__   Promise that ALWAYS resolves (never rejects)
                             once hydration has finished (or failed).
     window.__CONSOLE_DATA__ hero.console payload for main.js's animated
                             CI console (title/status/meta/testLines/footer).
   ==========================================================================*/

(() => {
    'use strict';

    const FILES = [
        'site-config', 'navigation', 'hero', 'about', 'experience',
        'skills', 'projects', 'education', 'contact', 'footer', 'profile'
    ];

    const fetchJson = (name) =>
        fetch(`data/${name}.json`)
            .then(r => (r.ok ? r.json() : null))
            .catch(() => null);

    // ---- Helpers -----------------------------------------------------------

    const $ = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

    const esc = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
    const arr = (v) => (Array.isArray(v) ? v : []);

    const setText = (sel, text) => {
        const el = $(sel);
        if (el && isStr(text)) el.textContent = text;
    };

    const hide = (sel) => {
        const el = $(sel);
        if (el) el.style.display = 'none';
    };

    const extAttrs = (url) => (/^https?:\/\//i.test(url) ? ' target="_blank" rel="noopener"' : '');

    const initials = (name) => {
        if (!isStr(name)) return '';
        const parts = name.trim().split(/\s+/).filter(w => /^[A-Za-z]/.test(w));
        if (!parts.length) return '';
        return parts.slice(0, 2).map(w => w[0].toUpperCase()).join('');
    };

    const firstName = (name) => (isStr(name) ? name.trim().split(/\s+/)[0] : '');

    // "A, B and C" style joining
    const joinNatural = (items) => {
        const list = items.filter(isStr);
        if (list.length <= 1) return list.join('');
        return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
    };

    // Each hydration region runs isolated so one bad payload can't
    // break the rest of the page.
    const safe = (label, fn) => {
        try { fn(); } catch (err) {
            if (window.console && console.warn) console.warn(`[data-loader] ${label} skipped:`, err);
        }
    };

    // ---- Hydration ---------------------------------------------------------

    const hydrate = (d) => {
        const profile = (d.profile && d.profile.profile) || {};
        const profileContact = (d.profile && d.profile.contact) || {};
        const name = profile.name || (d.hero && d.hero.name) || '';
        const title = profile.title || (d.hero && d.hero.title) || '';
        const ini = initials(name);

        // Contact lookups (contact.json contactInfo is an array typed by "type")
        const contactInfo = {};
        arr(d.contact && d.contact.contactInfo).forEach(c => {
            if (c && c.type) contactInfo[c.type] = c;
        });
        const email = (contactInfo.email && contactInfo.email.value) || profileContact.email || '';
        const phone = (contactInfo.phone && contactInfo.phone.value) || profileContact.phone || '';
        const location = (contactInfo.location && contactInfo.location.value) || '';
        const socialMedia = arr(d.contact && d.contact.socialMedia);

        // ---- <head>: title + meta
        safe('head', () => {
            const sc = d['site-config'] || {};
            const meta = sc.meta || sc;
            if (isStr(meta.title)) document.title = meta.title;
            const set = (sel, val) => {
                const el = $(sel);
                if (el && isStr(val)) el.setAttribute('content', val);
            };
            set('meta[name="description"]', meta.description);
            set('meta[name="author"]', meta.author || name);
            set('meta[property="og:title"]', meta.title);
            set('meta[property="og:description"]', meta.description);
        });

        // ---- Favicon monogram
        safe('favicon', () => {
            if (!ini) return;
            const fav = $('link[rel="icon"]');
            if (!fav) return;
            const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='#0a0b0d'/><text x='50%' y='54%' text-anchor='middle' dominant-baseline='middle' font-family='ui-monospace,Menlo' font-weight='600' font-size='14' fill='#d4ff3a'>${ini}</text></svg>`;
            fav.setAttribute('href', 'data:image/svg+xml,' + encodeURIComponent(svg));
        });

        // ---- Nav: monogram + role label
        safe('nav', () => {
            if (ini) setText('.nav__mark', ini);
            setText('.nav__role', title);
        });

        // ---- Hero
        safe('hero', () => {
            const hero = d.hero || {};

            // Headline built from segments; em:true keeps the italic-serif treatment.
            const segs = arr(hero.headline && hero.headline.segments)
                .filter(s => s && isStr(s.text));
            if (segs.length) {
                const h1 = $('.hero__title');
                if (h1) h1.innerHTML = segs
                    .map(s => (s.em ? `<em>${esc(s.text)}</em>` : esc(s.text)))
                    .join('');
            }

            // Eyebrow badge: location + open-to line
            const badge = $('.hero .eyebrow span:last-child');
            if (badge) {
                const openTo = isStr(title)
                    ? `Open to ${title.toLowerCase()} roles`
                    : 'Open to new opportunities';
                badge.textContent = [location, openTo].filter(isStr).join(' · ');
            }

            // Sub paragraph
            const sub = hero.summary || arr(d.about && d.about.paragraphs)[0];
            setText('.hero__sub', sub);

            // CTAs
            const btns = arr(hero.cta && hero.cta.buttons).filter(b => b && isStr(b.text) && isStr(b.href));
            const primaryBtn = $('.hero__cta .btn--primary');
            const ghostBtn = $('.hero__cta .btn--ghost');
            const bPrimary = btns.find(b => b.type === 'primary') || btns[0];
            const bGhost = btns.find(b => b !== bPrimary);
            if (primaryBtn && bPrimary) {
                primaryBtn.setAttribute('href', bPrimary.href);
                const span = primaryBtn.querySelector('span');
                if (span) span.textContent = bPrimary.text;
            }
            if (ghostBtn) {
                const span = ghostBtn.querySelector('span');
                if (bGhost) {
                    ghostBtn.setAttribute('href', bGhost.href);
                    if (span) span.textContent = bGhost.text;
                } else if (isStr(email)) {
                    ghostBtn.setAttribute('href', `mailto:${email}`);
                    if (span) span.textContent = email;
                }
            }

            // Social links
            const socials = arr(hero.socialLinks).filter(l => l && isStr(l.url) && isStr(l.platform));
            const ul = $('.hero__socials');
            if (ul && socials.length) {
                ul.innerHTML = socials
                    .map(l => `<li><a href="${esc(l.url)}"${extAttrs(l.url)}>${esc(l.platform)}</a></li>`)
                    .join('');
            }
        });

        // ---- Console card (animation itself lives in main.js; hand it the data)
        safe('console', () => {
            const c = (d.hero && d.hero.console) || null;
            window.__CONSOLE_DATA__ = c;
            if (!c) return;

            setText('.console__title', c.title);

            const status = $('.console__status');
            if (status && isStr(c.status)) {
                const dot = status.querySelector('.dot');
                status.textContent = '';
                if (dot) status.appendChild(dot);
                status.appendChild(document.createTextNode(c.status));
            }

            const metaEl = $('.console__meta');
            const metaRows = arr(c.meta).filter(m => m && isStr(m.label));
            if (metaEl && metaRows.length) {
                metaEl.innerHTML = metaRows.map(m => {
                    // main.js animates the "builds today" counter via #tps
                    const id = /build/i.test(m.label) ? ' id="tps"' : '';
                    return `<div><span class="k">${esc(m.label)}</span><span class="v"${id}>${esc(m.value)}</span></div>`;
                }).join('');
            }

            const footEl = $('.console__footer');
            const footRows = arr(c.footer).filter(f => f && isStr(f.label));
            if (footEl && footRows.length) {
                footEl.innerHTML = footRows.map((f, i) =>
                    `<span class="k">${esc(f.label)}</span><span class="v${i === 0 ? ' accent' : ''}">${esc(f.value)}</span>`
                ).join('');
            }
        });

        // ---- Marquee + impact strip (populated from about.statistics; hidden if absent)
        safe('metrics', () => {
            const stats = arr(d.about && d.about.statistics)
                .filter(s => s && isStr(String(s.value)) && isStr(s.label));

            const track = $('.marquee__track');
            if (stats.length && track) {
                const unit = stats
                    .map(s => `<span class="marquee__item">${esc(s.value)} ${esc(s.label)}</span><span class="marquee__sep">●</span>`);
                // Pad one sequence out, then duplicate it exactly 2x so the
                // -50% translate keyframe loops seamlessly.
                const reps = Math.max(1, Math.ceil(8 / unit.length));
                let seq = '';
                for (let i = 0; i < reps; i++) seq += unit.join('');
                track.innerHTML = seq + seq;
            } else {
                hide('.marquee');
            }

            const grid = $('.impact__grid');
            if (stats.length && grid) {
                grid.innerHTML = stats.slice(0, 4).map(s => {
                    const raw = String(s.value).trim();
                    const m = raw.match(/^([\d.,]+)\s*(.*)$/);
                    const num = m ? esc(m[1]) : esc(raw);
                    const unitHtml = (m && isStr(m[2])) ? `<span class="unit">${esc(m[2])}</span>` : '';
                    return `<article class="impact__cell"><div class="impact__num">${num}${unitHtml}</div><div class="impact__label">${esc(s.label)}</div></article>`;
                }).join('');
            } else {
                hide('.impact');
            }
        });

        // ---- About
        safe('about', () => {
            const about = d.about || {};
            const paragraphs = arr(about.paragraphs).filter(isStr);
            const fname = firstName(name);

            if (fname) {
                const h2 = $('.about__title');
                if (h2) h2.innerHTML = `Hello — I'm <em>${esc(fname)}</em>.`;
            }

            const lede = $('.about__lede');
            if (lede && paragraphs.length) {
                lede.textContent = paragraphs[0];
                $$('.about__body .about__para').forEach(p => p.remove());
                let after = lede;
                paragraphs.slice(1).forEach(text => {
                    const p = document.createElement('p');
                    p.className = 'about__para';
                    p.textContent = text;
                    after.insertAdjacentElement('afterend', p);
                    after = p;
                });
            }

            // Facts <dl>
            const facts = [];
            const currentCompany = (arr(d.experience && d.experience.experiences)[0] || {}).company;
            if (isStr(title)) {
                facts.push(['Role', esc(title) + (isStr(currentCompany) ? ` · ${esc(currentCompany)}` : '')]);
            }
            if (isStr(location)) facts.push(['Based in', esc(location)]);
            const edu0 = arr(d.education && d.education.education)[0];
            if (edu0 && isStr(edu0.degree)) {
                const school = edu0.school || edu0.institution;
                facts.push(['Education', esc(edu0.degree) + (isStr(school) ? ` · ${esc(school)}` : '')]);
            }
            const cat0 = arr(d.skills && d.skills.categories)[0];
            if (cat0 && arr(cat0.skills).length) {
                facts.push(['Specialties', arr(cat0.skills).slice(0, 4).map(esc).join(' · ')]);
            }
            facts.push(['Open to', isStr(title) ? `${esc(title)} roles` : 'New opportunities']);
            if (isStr(email)) {
                facts.push(['Contact', `<a href="mailto:${esc(email)}">${esc(email)}</a>`]);
            }
            const dl = $('.about__facts');
            if (dl && facts.length) {
                dl.innerHTML = facts
                    .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`)
                    .join('');
            }

            // Portrait caption + alt (image file itself stays as shipped)
            const cap = $('.about__portrait figcaption .v');
            if (cap && isStr(name)) {
                cap.textContent = [name, location, title].filter(isStr).join(' · ');
            }
            const img = $('.about__portrait img');
            if (img && isStr(name)) img.setAttribute('alt', `${name} — portrait`);
        });

        // ---- Work / Experience
        safe('work', () => {
            const jobs = arr(d.experience && d.experience.experiences)
                .filter(j => j && (isStr(j.title) || isStr(j.company)));
            if (!jobs.length) { hide('#work'); return; }

            const companies = jobs.map(j => j.company).filter(isStr);
            if (companies.length) {
                setText('#work .section__kicker', `Professional experience across ${joinNatural(companies)}.`);
            }

            const timeline = $('#work .timeline');
            if (!timeline) return;
            timeline.innerHTML = jobs.map(j => {
                const period = String(j.period || '');
                const years = period.match(/\d{4}/g) || [];
                const isCurrent = /present|current|now/i.test(period);
                const start = years[0] || '';
                const end = isCurrent ? 'now' : (years[1] || '');
                const yearsHtml = (start || end)
                    ? `<div class="role__years"><span>${esc(start)}</span><span>—</span><span>${esc(end)}</span></div>`
                    : `<div class="role__years"><span>${esc(period)}</span></div>`;

                // Skip the lede when it's just "<title> at <company>" boilerplate.
                const boiler = `${j.title} at ${j.company}`;
                const lede = (isStr(j.description) && j.description.trim() !== boiler) ? j.description : '';

                const bullets = arr(j.responsibilities).filter(isStr)
                    .map(r => `<li><span class="role__pt">${esc(r)}</span></li>`)
                    .join('');

                const tech = arr(j.technologies || j.skills).filter(isStr);
                const chips = tech.length
                    ? `<ul class="chips">${tech.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`
                    : '';

                return [
                    '<article class="role">',
                    '  <aside class="role__meta">',
                    `    ${yearsHtml}`,
                    isStr(j.location) ? `    <div class="role__location">${esc(j.location)}</div>` : '',
                    isCurrent ? '    <div class="role__tag">Current</div>' : '',
                    '  </aside>',
                    '  <div class="role__body">',
                    '    <header class="role__head">',
                    `      <h3 class="role__company">${esc(j.company || '')}</h3>`,
                    `      <p class="role__title">${esc(j.title || '')}</p>`,
                    lede ? `      <p class="role__lede">${esc(lede)}</p>` : '',
                    '    </header>',
                    bullets ? `    <ul class="role__bullets">${bullets}</ul>` : '',
                    chips ? `    ${chips}` : '',
                    '  </div>',
                    '</article>'
                ].filter(Boolean).join('\n');
            }).join('\n');
        });

        // ---- Projects
        safe('projects', () => {
            const projects = arr(d.projects && d.projects.projects).filter(p => p && isStr(p.title));
            if (!projects.length) { hide('#projects'); return; }

            const cats = [];
            projects.forEach(p => {
                if (isStr(p.category) && cats.indexOf(p.category) === -1) cats.push(p.category);
            });
            setText('#projects .section__kicker',
                cats.length ? `Selected work — ${cats.join(' · ')}.`
                            : ((d.projects && d.projects.sectionTitle) || ''));

            const wrap = $('#projects .projects');
            if (!wrap) return;
            wrap.innerHTML = projects.map((p, i) => {
                const idx = `P/${String(i + 1).padStart(2, '0')}`;
                const tech = arr(p.technologies).filter(isStr);
                const gh = (p.links && p.links.github) || p.github || '';
                const year = String((p.stats && p.stats.year) || '').trim();

                const metaBits = [p.category, year].filter(isStr);
                const metaHtml = metaBits.length
                    ? `<div class="project__meta">${metaBits.map(b => `<span>${esc(b)}</span>`).join('<span>·</span>')}</div>`
                    : '';

                const rail = [];
                if (isStr(year)) rail.push(`<div><span class="m">${esc(year)}</span><span class="l">shipped</span></div>`);
                if (tech.length) rail.push(`<div><span class="m">${tech.length}</span><span class="l">core technologies</span></div>`);
                if (isStr(gh)) rail.push(`<a class="award__link" href="${esc(gh)}"${extAttrs(gh)}>View on GitHub →</a>`);
                const railHtml = rail.length ? `<div class="project__metrics">${rail.join('')}</div>` : '';

                const chips = tech.length
                    ? `<ul class="chips chips--sm">${tech.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`
                    : '';

                return [
                    '<article class="project">',
                    `  <div class="project__index">${idx}</div>`,
                    metaHtml ? `  ${metaHtml}` : '',
                    `  <h3 class="project__title">${esc(p.title)}</h3>`,
                    isStr(p.description) ? `  <p class="project__desc">${esc(p.description)}</p>` : '',
                    railHtml ? `  ${railHtml}` : '',
                    chips ? `  ${chips}` : '',
                    '</article>'
                ].filter(Boolean).join('\n');
            }).join('\n');
        });

        // ---- Stack / Skills
        safe('stack', () => {
            const cats = arr(d.skills && d.skills.categories)
                .filter(c => c && isStr(c.category) && arr(c.skills).length);
            if (!cats.length) { hide('#stack'); return; }
            const wrap = $('#stack .stack');
            if (!wrap) return;
            wrap.innerHTML = cats.map(c => [
                '<div class="stack__col">',
                `  <h4>${esc(c.category)}</h4>`,
                `  <ul class="stack__list">${arr(c.skills).filter(isStr).map(s => `<li>${esc(s)}</li>`).join('')}</ul>`,
                '</div>'
            ].join('\n')).join('\n');
        });

        // ---- Credentials (education + certifications + awards)
        safe('credentials', () => {
            const ed = d.education || {};
            const eduList = arr(ed.education).filter(e => e && isStr(e.degree));
            const certList = arr(ed.certifications).filter(c => c && isStr(c.title || c.name));
            const awardList = arr(ed.awards).filter(a => a && isStr(a.title || a.name));
            if (!eduList.length && !certList.length && !awardList.length) { hide('#credentials'); return; }

            const blocks = [];

            if (eduList.length) {
                const items = eduList.map(e => {
                    const school = [e.school || e.institution, e.location].filter(isStr).join(' · ');
                    const years = String(e.period || '').replace(/\s*-\s*/, ' — ');
                    const note = e.details || e.description;
                    return [
                        '<article class="edu">',
                        `  <div class="edu__years">${esc(years)}</div>`,
                        '  <div class="edu__body">',
                        `    <h5>${esc(e.degree)}</h5>`,
                        isStr(school) ? `    <p>${esc(school)}</p>` : '',
                        isStr(note) ? `    <p class="edu__note">${esc(note)}</p>` : '',
                        '  </div>',
                        '</article>'
                    ].filter(Boolean).join('\n');
                }).join('\n');
                blocks.push(`<div class="creds__block"><h4 class="creds__label">Education</h4>${items}</div>`);
            }

            if (certList.length) {
                const shortIssuer = (issuer) => {
                    if (!isStr(issuer)) return '—';
                    if (issuer.length <= 12) return issuer;
                    const abbr = issuer.split(/\s+/).map(w => w[0]).join('').toUpperCase();
                    return abbr.length >= 2 ? abbr : issuer;
                };
                const items = certList.map(c =>
                    `<li><span class="cert__issuer">${esc(shortIssuer(c.issuer))}</span><span class="cert__name">${esc(c.title || c.name)}${isStr(c.date) ? ` · ${esc(c.date)}` : ''}</span></li>`
                ).join('');
                const label = ed.certificationsTitle || 'Certifications';
                blocks.push(`<div class="creds__block"><h4 class="creds__label">${esc(label)}</h4><ul class="cert-list">${items}</ul></div>`);
            }

            if (awardList.length) {
                const items = awardList.map(a => {
                    const org = [a.issuer || a.organization, a.date || a.year].filter(isStr).join(' · ');
                    return [
                        '<article class="award">',
                        `  <h5>${esc(a.title || a.name)}</h5>`,
                        isStr(org) ? `  <p class="award__org">${esc(org)}</p>` : '',
                        isStr(a.description) ? `  <p>${esc(a.description)}</p>` : '',
                        isStr(a.url) ? `  <a class="award__link" href="${esc(a.url)}"${extAttrs(a.url)}>View →</a>` : '',
                        '</article>'
                    ].filter(Boolean).join('\n');
                }).join('\n');
                const label = ed.awardsTitle || 'Awards';
                blocks.push(`<div class="creds__block"><h4 class="creds__label">${esc(label)}</h4>${items}</div>`);
            }

            const wrap = $('#credentials .creds');
            if (wrap) wrap.innerHTML = blocks.join('\n');
        });

        // ---- Contact
        safe('contact', () => {
            const c = d.contact || {};
            setText('#contact .section__kicker', c.subtitle);

            const cards = [];
            if (isStr(email)) {
                cards.push({ kind: 'Email', value: email, href: `mailto:${email}` });
            }
            socialMedia.filter(s => s && isStr(s.url) && isStr(s.platform)).forEach(s => {
                let value = s.url.replace(/^https?:\/\/(www\.)?/i, '');
                if (/github\.com/i.test(s.url)) {
                    const m = s.url.match(/github\.com\/([^/?#]+)/i);
                    if (m) value = `@${m[1]}`;
                } else if (/linkedin\.com/i.test(s.url)) {
                    const m = s.url.match(/linkedin\.com(\/in\/[^/?#]+)/i);
                    if (m) value = m[1];
                }
                cards.push({ kind: s.platform, value, href: s.url });
            });
            if (isStr(phone)) {
                const href = (contactInfo.phone && contactInfo.phone.href) || `tel:${phone.replace(/[^+\d]/g, '')}`;
                cards.push({ kind: 'Phone', value: phone, href });
            }

            const wrap = $('#contact .contact');
            if (wrap && cards.length) {
                wrap.innerHTML = cards.map(card => [
                    `<a class="contact__card" href="${esc(card.href)}"${extAttrs(card.href)}>`,
                    `  <span class="contact__kind">${esc(card.kind)}</span>`,
                    `  <span class="contact__value">${esc(card.value)}</span>`,
                    '  <span class="contact__arrow">↗</span>',
                    '</a>'
                ].join('\n')).join('\n');
            }
        });

        // ---- Footer
        safe('footer', () => {
            const f = d.footer || {};
            if (ini) setText('.footer__mark', ini);

            const brandText = $('.footer__brand > span:last-child');
            if (brandText && isStr(name)) {
                brandText.textContent = [name, title, location].filter(isStr).join(' · ');
            }

            // "Elsewhere" column: social links + the static resume link
            const elsewhere = $$('.footer__col').filter(col => {
                const label = col.querySelector('.footer__label');
                return label && /elsewhere/i.test(label.textContent);
            })[0];
            const socials = arr(f.socialLinks).filter(l => l && isStr(l.url) && isStr(l.platform));
            if (elsewhere && socials.length) {
                const resume = elsewhere.querySelector('a[href$=".pdf"]');
                const resumeHtml = resume ? resume.outerHTML : '';
                elsewhere.innerHTML =
                    '<span class="footer__label">Elsewhere</span>' +
                    socials.map(l => `<a href="${esc(l.url)}"${extAttrs(l.url)}>${esc(l.platform)}</a>`).join('') +
                    resumeHtml;
            }

            // Copyright line (main.js keeps #year fresh after hydration)
            const yearEl = $('#year');
            const copyName = (f.copyright && f.copyright.name) || name;
            if (yearEl && yearEl.parentElement && isStr(copyName)) {
                const y = (f.copyright && f.copyright.year) || new Date().getFullYear();
                yearEl.parentElement.innerHTML = `© <span id="year">${esc(y)}</span> ${esc(copyName)}.`;
            }
        });
    };

    // ---- Boot: fetch everything, hydrate, and ALWAYS resolve ---------------

    window.__DATA_READY__ = Promise.all(FILES.map(fetchJson))
        .then(results => {
            const d = {};
            FILES.forEach((name, i) => { d[name] = results[i]; });
            // If literally nothing loaded (e.g. file:// preview), leave the
            // static placeholder page untouched.
            if (results.some(r => r !== null)) hydrate(d);
        })
        .catch(err => {
            if (window.console && console.warn) console.warn('[data-loader] hydration failed:', err);
        });
})();
