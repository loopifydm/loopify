/* Loopify analytics configuration.
   Replace the placeholder IDs below after creating the properties in GA4 and Meta Events Manager. */
const LOOPIFY_GA4_ID='G-XXXXXXXXXX';
const LOOPIFY_META_PIXEL_ID='000000000000000';

(function(){
  if(/^G-[A-Z0-9]+$/i.test(LOOPIFY_GA4_ID) && !LOOPIFY_GA4_ID.includes('XXXXXXXX')){
    const s=document.createElement('script');s.async=true;s.src=`https://www.googletagmanager.com/gtag/js?id=${LOOPIFY_GA4_ID}`;document.head.appendChild(s);
    window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};window.gtag('js',new Date());window.gtag('config',LOOPIFY_GA4_ID);
  }
  if(/^\d{8,20}$/.test(LOOPIFY_META_PIXEL_ID) && !LOOPIFY_META_PIXEL_ID.startsWith('000000')){
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init',LOOPIFY_META_PIXEL_ID);window.fbq('track','PageView');
  }
  document.querySelectorAll('[data-track]').forEach(el=>el.addEventListener('click',()=>{const event=el.dataset.track;if(window.gtag)window.gtag('event',event);if(window.fbq)window.fbq('trackCustom',event)}));
})();
