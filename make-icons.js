// Génère les icônes PNG à partir de assets/icon.svg
const sharp = require('sharp');
const fs = require('fs');
(async () => {
  const svg = fs.readFileSync('assets/icon.svg');
  await sharp(svg).resize(1024, 1024).png().toFile('assets/icon.png');
  await sharp(svg).resize(48, 48).png().toFile('assets/favicon.png');
  const small = await sharp(svg).resize(680, 680).png().toBuffer();
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: small, left: 172, top: 172 }]).png().toFile('assets/adaptive-icon.png');
  const sp = await sharp(svg).resize(520, 520).png().toBuffer();
  await sharp({ create: { width: 1284, height: 2778, channels: 4, background: '#0A7E9C' } })
    .composite([{ input: sp, left: 382, top: 1009 }]).png().toFile('assets/splash.png');
  console.log('icons ok');
})();
