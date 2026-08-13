import { Jimp } from 'jimp';
for (const f of process.argv.slice(2)) {
  try { const i = await Jimp.read(f); console.log(`${f.split('/').pop()}: ${i.bitmap.width}x${i.bitmap.height}`); }
  catch (e) { console.log(`${f}: 読めず`); }
}
