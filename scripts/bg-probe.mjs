import { chromium } from 'playwright';
const B='http://localhost:3000';
const CASES=[
 ['/general/aesthetic/','.aesthetic-label'],
 ['/general/implant/','.implant-label'],
 ['/general/periodontal/','.perio-subheading'],
 ['/price/','.price-table-block__list-title'],
 ['/general/','.general-intro__card'],
 ['/general/','#cavity'],
 ['/pediatric/','.pediatric-specialist__card'],
 ['/pediatric/','.pediatric-worry .inner'],
 ['/pediatric/','#age-care'],
];
const br=await chromium.launch();
const ctx=await br.newContext({viewport:{width:1600,height:900}});
const pg=await ctx.newPage();
for(const [p,s] of CASES){
  await pg.goto(B+p,{waitUntil:'domcontentloaded'});
  const r=await pg.evaluate((sel)=>{
    const el=document.querySelector(sel); if(!el) return '!! 要素なし';
    const own=getComputedStyle(el).backgroundColor;
    let chain=[],n=el.parentElement;
    while(n&&chain.length<4){const c=getComputedStyle(n).backgroundColor;
      if(c!=='rgba(0, 0, 0, 0)') chain.push(n.className.toString().slice(0,34)+':'+c);
      n=n.parentElement;}
    const r2=el.getBoundingClientRect();
    return `self=${own}  w=${Math.round(r2.width)}  親=[${chain.join(' | ')}]`;
  },s);
  console.log((p+' '+s).padEnd(46)+r);
}
await br.close();
