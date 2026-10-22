const { execSync } = require('child_process');

console.log('[ SIMULATION ] Running 45-day real engine simulation against fake-indexeddb via Vitest...');
try {
  execSync('npx vitest run src/engine/__tests__/simulation.test.ts', { stdio: 'inherit' });
} catch (err) {
  process.exit(1);
}
