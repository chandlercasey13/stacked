import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await puppeteer.launch({ executablePath: CHROME, headless:"new", args:["--no-sandbox","--hide-scrollbars","--disable-gpu"] });
const page = await browser.newPage();
await page.emulate({ viewport:{ width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true }, userAgent:"Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1" });
await page.goto("https://lakesareasurfacing.com",{waitUntil:"networkidle2",timeout:60000});
await new Promise(r=>setTimeout(r,2000));
const cs = await page.evaluate(()=>{
  const g=(sel,props)=>{const e=document.querySelector(sel);if(!e)return {sel,missing:true};const s=getComputedStyle(e);const o={sel};props.forEach(p=>o[p]=s.getPropertyValue(p));return o;};
  return [
    g('.site-header',['background-color','padding-top','padding-bottom','padding-left','padding-right']),
    g('.header-brand span',['color','font-size','font-weight','display']),
    g('.header-cta',['background-color','color','font-size','font-weight','padding-top','padding-left','border-radius','border']),
    g('.header-nav',['display']),
    g('.hero-overlay',['background-color','background-image']),
    g('.hero-eyebrow',['color','font-size','font-weight','letter-spacing','text-transform']),
    g('.hero-headline',['color','font-size','font-weight','line-height','text-transform','font-family','letter-spacing']),
    g('.hero-sub',['color','font-size','line-height']),
    g('.btn-white',['background-color','color','font-size','font-weight','padding-top','padding-left','border-radius']),
    g('.btn-outline',['color','border','font-size','font-weight','padding-top','padding-left','border-radius']),
  ];
});
console.log(JSON.stringify(cs,null,0));
await browser.close();
