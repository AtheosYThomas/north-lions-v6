const p = '../functions/lib/index.js';
try {
  const m = require(p);
  console.log('exports:', Object.keys(m));
} catch (e) {
  console.error('failed to require', p, e && e.stack ? e.stack : e);
  process.exit(1);
}
