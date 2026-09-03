import { Jimp } from 'jimp';
import fs from 'node:fs';
const map = JSON.parse(fs.readFileSync(process.argv[2],'utf8')).meta.images;
for (const ref of process.argv.slice(3)) {
  const url = map[ref];
  if (!url) { console.log(ref, 'なし'); continue; }
  const im = await Jimp.read(Buffer.from(await (await fetch(url)).arrayBuffer()));
  let t=0,n=0;
  for(let y=0;y<im.height;y+=9)for(let x=0;x<im.width;x+=9){n++;if(im.bitmap.data[(im.width*y+x)*4+3]<10)t++;}
  console.log(ref.slice(0,10), `${im.width}x${im.height}`, 'alpha='+im.hasAlpha(), '透過率='+(t/n*100).toFixed(1)+'%');
}
