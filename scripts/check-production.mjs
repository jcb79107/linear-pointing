const origin = 'https://public-linear-pointing.vercel.app';
for (const [path, status, text] of [['/', 200, 'Pointed'], ['/demo', 200, 'Jared'], ['/privacy', 200, 'Your data'], ['/support', 200, 'Help with Pointed'], ['/api/health', 200, 'ok']]) {
  const response = await fetch(origin + path, { signal: AbortSignal.timeout(20000), redirect: 'manual' });
  if (response.status !== status || !(await response.text()).includes(text)) throw new Error(`Production check failed: ${path} (${response.status})`);
  console.log(`PASS ${path}`);
}
