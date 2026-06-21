import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await puppeteer.launch({ executablePath: CHROME, headless:"new", args:["--no-sandbox","--hide-scrollbars","--disable-gpu"] });
const page = await browser.newPage();
await page.emulate({ viewport:{ width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true }, userAgent:"Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1" });
await page.goto("https://lakesareasurfacing.com",{waitUntil:"networkidle2",timeout:60000});
await new Promise(r=>setTimeout(r,2500));
// header + hero outerHTML
const out = await page.evaluate(()=>{
  const pick = (sel)=>{const e=document.querySelector(sel);return e?e.outerHTML:null;};
  const header = document.querySelector('header, nav, [class*=header], [class*=nav]');
  const main = document.querySelector('main') || document.body;
  const firstSections = [...main.children].slice(0,3).map(c=>c.outerHTML.slice(0,4000));
  return {
    title: document.title,
    header: header?header.outerHTML.slice(0,4000):null,
    sections: firstSections,
    bodyClass: document.body.className,
  };
});
console.log(JSON.stringify(out,null,1).slice(0,9000));
await browser.close();
