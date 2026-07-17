/* ==========================================================================
   Elena Kowalski — Portfolio JS
   ==========================================================================*/

(() => {
    'use strict';

    // Runs after data-loader.js has hydrated the DOM from data/*.json
    // (window.__DATA_READY__ always resolves; falls back to immediate
    // init when data-loader is absent).
    const init = () => {

    // ---- Year
    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

    // ---- Nav: scrolled state + mobile toggle
    const nav = document.getElementById('nav');
    const burger = document.getElementById('navBurger');

    const onScroll = () => {
        if (!nav) return;
        nav.classList.toggle('is-scrolled', window.scrollY > 24);
        const toTop = document.getElementById('toTop');
        if (toTop) toTop.classList.toggle('is-visible', window.scrollY > 600);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (burger && nav) {
        burger.addEventListener('click', () => {
            const isOpen = nav.classList.toggle('is-open');
            burger.setAttribute('aria-expanded', String(isOpen));
        });
        nav.querySelectorAll('.nav__menu a').forEach(a => {
            a.addEventListener('click', () => {
                nav.classList.remove('is-open');
                burger.setAttribute('aria-expanded', 'false');
            });
        });
    }

    // ---- Back to top
    const toTop = document.getElementById('toTop');
    if (toTop) {
        toTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ---- Console: animated validation test-harness log
    const log = document.getElementById('log');
    const tpsEl = document.getElementById('tps');

    if (log) {
        const MAX_LINES = 9;
        const lines = [];

        const pad2 = n => String(n).padStart(2, '0');
        const now = () => {
            const d = new Date();
            return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
        };

        // Pool of embedded validation test names.
        const TESTS = [
            'uart_loopback', 'spi_flash_rw', 'i2c_sensor_probe', 'can_bus_arbitration',
            'gpio_irq_latency', 'dma_transfer', 'rtos_sched_jitter', 'mem_leak_scan',
            'linux_dmesg_parse', 'fw_crc_verify', 'bootloader_handoff', 'watchdog_reset',
            'adc_sample_rate', 'power_seq_bringup', 'thermal_throttle', 'reg_dump_diff'
        ];
        // Prefer test lines handed over by data-loader.js (hero.console.testLines);
        // fall back to the built-in pool when no data is available.
        const DATA_LINES = (window.__CONSOLE_DATA__ &&
            Array.isArray(window.__CONSOLE_DATA__.testLines) &&
            window.__CONSOLE_DATA__.testLines.length)
            ? window.__CONSOLE_DATA__.testLines
            : null;

        const pick = () => DATA_LINES
            ? DATA_LINES[Math.floor(Math.random() * DATA_LINES.length)]
            : { name: `test_${TESTS[Math.floor(Math.random() * TESTS.length)]}` };

        // Verdict distribution: mostly pass, occasional skip, rare fail.
        const nextVerdict = () => {
            const r = Math.random();
            if (r < 0.86) return ['PASS', 'allow'];
            if (r < 0.95) return ['SKIP', 'score'];
            return ['FAIL', 'block'];
        };

        const VERDICT_CLASS = { PASS: 'allow', SKIP: 'score', FAIL: 'block' };

        const addLine = () => {
            const entry = pick();
            const name = entry.name || 'test_case';
            const [rv, rcls] = nextVerdict();
            const v = entry.verdict || rv;
            const cls = VERDICT_CLASS[v] || rcls;
            const ms = entry.duration
                ? String(entry.duration).replace(/\s*ms$/i, '')
                : (1 + Math.random() * 240).toFixed(0);
            const dots = '.'.repeat(Math.max(2, 26 - name.length));
            const line = `<span class="ts">[${now()}]</span> <span class="id">${name}</span> <span class="score">${dots}</span> <span class="${cls}">${v}</span> <span class="score">${ms}ms</span>`;
            lines.push(line);
            if (lines.length > MAX_LINES) lines.shift();
            const caret = '<span class="caret"></span>';
            log.innerHTML = lines.join('\n') + caret;
        };

        // Prime with a few lines, then tick
        for (let i = 0; i < MAX_LINES; i++) addLine();

        const scheduleNext = () => {
            const delay = 650 + Math.random() * 900;
            setTimeout(() => { addLine(); scheduleNext(); }, delay);
        };
        scheduleNext();

        // Subtle "builds today" flicker
        if (tpsEl) {
            let builds = parseInt(tpsEl.textContent, 10) || 37;
            setInterval(() => {
                if (Math.random() < 0.25) builds += 1;
                tpsEl.textContent = String(builds);
            }, 1500);
        }
    }

    // ---- Reveal on scroll
    const revealTargets = document.querySelectorAll(
        '.section__head, .role, .project, .stack__col, .creds__block, .contact__card, .impact__cell'
    );
    revealTargets.forEach(el => el.classList.add('reveal'));

    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-in');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
        revealTargets.forEach(el => io.observe(el));
    } else {
        revealTargets.forEach(el => el.classList.add('is-in'));
    }

    // ---- Smooth anchor scroll with nav offset
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', (e) => {
            const id = a.getAttribute('href');
            if (!id || id === '#') return;
            const target = document.querySelector(id);
            if (!target) return;
            e.preventDefault();
            const offset = 72;
            const top = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        });
    });

    };

    const ready = (window.__DATA_READY__ && typeof window.__DATA_READY__.then === 'function')
        ? window.__DATA_READY__
        : Promise.resolve();
    ready.then(init, init);

})();
