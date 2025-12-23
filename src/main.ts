import './app.css';
import App from './App.svelte';
import { mount } from 'svelte';

// Expose debug utilities in development or when VITE_DEBUG is set
const debugMode = import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true';

if (debugMode) {
  import('./lib/db/debug').then(({ dbDebug, query, queryOne, exec, transaction }) => {
    (window as any).dbDebug = dbDebug;
    (window as any).db = { query, queryOne, exec, transaction };

    console.log('🔍 Database debug utilities available:');
    console.log('   window.db.query(sql, params)');
    console.log('   window.db.queryOne(sql, params)');
    console.log('   window.db.exec(sql, params)');
    console.log('   window.dbDebug.runQuery(sql, params)');
    console.log('   window.dbDebug.getStats()');
  });
}

const app = mount(App, {
  target: document.getElementById('app')!
});

export default app;
