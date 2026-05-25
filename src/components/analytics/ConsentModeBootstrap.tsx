import Script from 'next/script'

/**
 * Consent Mode v2 Default — synchron im <head>, vor allen GA/Pixel-Tags.
 *
 * Setzt alle 4 Kategorien (analytics_storage, ad_storage, ad_user_data,
 * ad_personalization) auf "denied". Updates auf "granted" passieren erst
 * nach expliziter User-Zustimmung über den ConsentBanner.
 *
 * `wait_for_update: 500` weist Google-Tags an, bis zu 500ms auf ein
 * Consent-Update zu warten, bevor sie endgültig denied-Daten senden.
 */
export default function ConsentModeBootstrap() {
  return (
    <Script
      id="consent-mode-default"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          window.gtag = window.gtag || gtag;
          gtag('consent', 'default', {
            'analytics_storage': 'denied',
            'ad_storage': 'denied',
            'ad_user_data': 'denied',
            'ad_personalization': 'denied',
            'wait_for_update': 500
          });
          gtag('set', 'ads_data_redaction', true);
          gtag('set', 'url_passthrough', true);
          try {
            var stored = localStorage.getItem('cm_cookie_consent_v2');
            if (stored) {
              var s = JSON.parse(stored);
              gtag('consent', 'update', {
                analytics_storage: s.analytics_storage || 'denied',
                ad_storage: s.ad_storage || 'denied',
                ad_user_data: s.ad_user_data || 'denied',
                ad_personalization: s.ad_personalization || 'denied'
              });
            }
          } catch (e) {}
        `,
      }}
    />
  )
}
