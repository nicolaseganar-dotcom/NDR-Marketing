/**
 * NDR Marketing · config-loader.js
 * Carga configuración desde Supabase e inyecta tracking (Meta Pixel + GA4),
 * actualiza WhatsApp links y aplica imágenes dinámicas.
 *
 * Para activar: reemplaza SUPABASE_URL y SUPABASE_ANON_KEY con tus credenciales.
 */

(function () {
  // ─── CONFIGURACIÓN ────────────────────────────────────────────────────────
  const SUPABASE_URL = 'REEMPLAZAR_CON_TU_SUPABASE_URL';       // ej: https://xxxx.supabase.co
  const SUPABASE_ANON_KEY = 'REEMPLAZAR_CON_TU_ANON_KEY';      // Anon key pública

  // Valores por defecto (se usan si Supabase no está configurado o falla)
  const DEFAULTS = {
    whatsapp_number: '56926879731',
    whatsapp_message: 'Hola Nicolás, vengo de tu web y me gustaría saber más sobre tus servicios.',
    calendly_url: 'https://calendly.com/ndrmarketing',
    pixel_id: '',
    ga4_id: '',
  };

  // ─── UTILS ────────────────────────────────────────────────────────────────
  const isConfigured = SUPABASE_URL !== 'REEMPLAZAR_CON_TU_SUPABASE_URL';

  async function fetchConfig() {
    if (!isConfigured) return DEFAULTS;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/site_config?select=key,value`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });
      if (!res.ok) return DEFAULTS;
      const rows = await res.json();
      const config = { ...DEFAULTS };
      rows.forEach(({ key, value }) => { if (value) config[key] = value; });
      return config;
    } catch {
      return DEFAULTS;
    }
  }

  // ─── TRACKING ─────────────────────────────────────────────────────────────
  function injectMetaPixel(pixelId) {
    if (!pixelId) return;
    const script = document.createElement('script');
    script.textContent = `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${pixelId}');fbq('track','PageView');`;
    document.head.appendChild(script);
    // noscript pixel
    const ns = document.createElement('noscript');
    ns.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>`;
    document.body && document.body.appendChild(ns);
  }

  function injectGA4(measurementId) {
    if (!measurementId) return;
    const s1 = document.createElement('script');
    s1.async = true;
    s1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(s1);
    const s2 = document.createElement('script');
    s2.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${measurementId}');`;
    document.head.appendChild(s2);
  }

  // ─── WHATSAPP ─────────────────────────────────────────────────────────────
  function updateWhatsAppLinks(number, message) {
    const encoded = encodeURIComponent(message);
    const newHref = `https://wa.me/${number}?text=${encoded}`;
    document.querySelectorAll('a[href*="wa.me"]').forEach(el => {
      el.href = newHref;
    });
  }

  // ─── IMÁGENES DINÁMICAS ───────────────────────────────────────────────────
  function updateDynamicImages(config) {
    // og:image de la página actual
    const ogKey = 'og_image_' + getCurrentPageKey();
    if (config[ogKey]) {
      const ogMeta = document.querySelector('meta[property="og:image"]');
      if (ogMeta) ogMeta.setAttribute('content', config[ogKey]);
    }
    // Foto de perfil en quienes-somos
    if (config['profile_photo']) {
      const profileImg = document.querySelector('.profile-photo, .photo-placeholder, [data-profile-photo]');
      if (profileImg) {
        if (profileImg.tagName === 'IMG') {
          profileImg.src = config['profile_photo'];
        } else {
          profileImg.style.backgroundImage = `url(${config['profile_photo']})`;
        }
      }
    }
  }

  function getCurrentPageKey() {
    const path = window.location.pathname.replace(/\//g, '').replace('.html', '').replace(/[^a-z0-9]/gi, '_') || 'index';
    if (path.includes('diseño') || path.includes('diseno')) return 'diseno_web';
    if (path.includes('quienes')) return 'quienes_somos';
    if (path.includes('portafolio')) return 'portafolio';
    if (path.includes('precios')) return 'precios_web';
    return 'paid_media';
  }

  // ─── STATS DINÁMICAS ──────────────────────────────────────────────────────
  function updateStats(config) {
    const map = {
      stat_revenue: '[data-stat="revenue"]',
      stat_roas: '[data-stat="roas"]',
      stat_years: '[data-stat="years"]',
      stat_clients: '[data-stat="clients"]',
    };
    Object.entries(map).forEach(([key, selector]) => {
      if (config[key]) {
        document.querySelectorAll(selector).forEach(el => { el.textContent = config[key]; });
      }
    });
  }

  // ─── INIT ─────────────────────────────────────────────────────────────────
  async function init() {
    const config = await fetchConfig();

    injectMetaPixel(config.pixel_id);
    injectGA4(config.ga4_id);

    // Esperar DOM listo para manipular elementos
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => applyDOM(config));
    } else {
      applyDOM(config);
    }
  }

  function applyDOM(config) {
    updateWhatsAppLinks(config.whatsapp_number, config.whatsapp_message);
    updateDynamicImages(config);
    updateStats(config);
  }

  init();
})();
