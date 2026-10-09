#!/usr/bin/env node
/*
 * 离线渲染 delivery-film.html
 *
 *   node video/render.cjs --sheet            # 每拍一帧拼成缩略图 → video/contact-sheet.png
 *   node video/render.cjs                    # 60fps、每帧 6 个子帧运动模糊 → video/delivery-film.mp4
 *   node video/render.cjs --fps 30 --sub 3   # 快速预览
 *
 * 依赖：playwright（含 Chromium）与 ffmpeg。
 */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const arg = (name, def) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : def; };
const SHEET = argv.includes('--sheet');
const FPS = +arg('--fps', 60);
const SUB = +arg('--sub', 6);
const OUT = path.resolve(arg('--out', path.join(__dirname, SHEET ? 'contact-sheet.png' : 'delivery-film.mp4')));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.join(__dirname, 'delivery-film.html') + '?render');
  await page.waitForFunction(() => window.FILM && window.FILM.ready);
  await page.evaluate(() => document.fonts.ready);

  if (SHEET) {
    const per = +arg('--per', 1);
    const data = await page.evaluate(per => {
      const times = [];
      for (let i = 0; i < FILM.BEATS * per; i++) times.push((i + 0.5) / per * FILM.B);
      return FILM.sheet(times, 6 * per > 12 ? 12 : 6 * per);
    }, per);
    fs.writeFileSync(OUT, Buffer.from(data.split(',')[1], 'base64'));
    console.log('wrote', OUT);
    await browser.close();
    return;
  }

  const total = Math.round(await page.evaluate(() => FILM.DUR) * FPS);
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'slow', '-movflags', '+faststart', OUT
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));

  for (let i = 0; i < total; i++) {
    const data = await page.evaluate(([i, fps, sub]) => FILM.frame(i, fps, sub), [i, FPS, SUB]);
    if (!ff.stdin.write(Buffer.from(data.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (i % FPS === 0) process.stdout.write(`\r${i}/${total}`);
  }
  ff.stdin.end();
  await done;
  await browser.close();
  console.log(`\rwrote ${OUT} (${total} frames)`);
})().catch(e => { console.error(e); process.exit(1); });
