const $ = id => document.getElementById(id);
let mode = 'login';
let expiryTimer;
async function api(path, options = {}) {
  const res = await fetch(path, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', 'X-Authora-Client': 'web', ...options.headers } });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed.'), { status: res.status });
  return data;
}
function message(id, text) { $(id).textContent = text; $(id).hidden = !text; }
function setMode(next) {
  mode = next; const register = mode === 'register';
  $('name-field').hidden = !register; $('name').required = register;
  $('password-hint').hidden = !register;
  $('password').minLength = register ? 12 : 1;
  $('password').autocomplete = register ? 'new-password' : 'current-password';
  $('password').value = ''; $('password').type = 'password'; $('show-password').textContent = 'Show'; $('show-password').setAttribute('aria-label', 'Show password');
  $('form-title').textContent = register ? 'Make it yours.' : 'Welcome back.';
  $('form-subtitle').textContent = register ? 'Create your account. Your space is ready.' : 'Sign in and pick up where you left off.';
  $('submit').firstElementChild.textContent = register ? 'Create your account' : 'Sign in to your space';
  $('login-tab').setAttribute('aria-selected', String(!register)); $('register-tab').setAttribute('aria-selected', String(register));
  message('form-message', '');
}
function signedOut(text = '') {
  clearTimeout(expiryTimer); $('auth-view').hidden = false; $('dashboard').hidden = true; $('auth-form').reset();
  $('api-response').textContent = 'Run a request to see your verified response.'; $('response-status').textContent = 'Ready when you are';
  for (const id of ['user-name','user-email','avatar','greeting','created','expires']) $(id).textContent = '';
  setMode('login'); message('form-message', text);
}
async function loadAccount() {
  const { user, expiresAt } = await api('/api/auth/me');
  $('auth-view').hidden = true; $('dashboard').hidden = false;
  $('greeting').textContent = user.name.split(/\s+/)[0] + '.';
  $('user-name').textContent = user.name; $('user-email').textContent = user.email;
  $('avatar').textContent = user.name.split(/\s+/).slice(0,2).map(n => n[0]).join('').toUpperCase();
  $('created').textContent = new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  $('expires').textContent = new Date(expiresAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  clearTimeout(expiryTimer); expiryTimer = setTimeout(() => signedOut('Your session expired. Please sign in again.'), Math.max(0, new Date(expiresAt) - Date.now()));
  $('password').value = ''; message('dash-message','');
}
$('login-tab').onclick = () => setMode('login');
$('register-tab').onclick = () => setMode('register');
for (const id of ['login-tab','register-tab']) $(id).onkeydown = e => { if (['ArrowLeft','ArrowRight'].includes(e.key)) { e.preventDefault(); setMode(mode === 'login' ? 'register' : 'login'); $(mode+'-tab').focus(); } };
$('show-password').onclick = () => { const show = $('password').type === 'password'; $('password').type = show ? 'text' : 'password'; $('show-password').textContent = show ? 'Hide' : 'Show'; $('show-password').setAttribute('aria-label', show ? 'Hide password' : 'Show password'); };
$('auth-form').onsubmit = async e => {
  e.preventDefault(); message('form-message', ''); $('submit').disabled = true;
  try { await api('/api/auth/' + mode, { method: 'POST', body: JSON.stringify({ name: $('name').value, email: $('email').value, password: $('password').value }) }); await loadAccount(); }
  catch (err) { message('form-message', err.message === 'Failed to fetch' ? 'Cannot reach the server. Please try again.' : err.message); }
  finally { $('submit').disabled = false; }
};
$('logout').onclick = async () => {
  $('logout').disabled = true;
  try { await api('/api/auth/logout', { method: 'POST', body: '{}' }); signedOut(); }
  catch (err) { if (err.status === 401) signedOut(); else message('dash-message', 'Sign out failed. Please try again.'); }
  finally { $('logout').disabled = false; }
};
$('test-api').onclick = async () => {
  $('test-api').disabled = true; $('response-status').textContent = 'Checking…';
  try { const data = await api('/api/protected'); $('api-response').textContent = JSON.stringify(data, null, 2); $('response-status').textContent = '200 · Access granted'; }
  catch (err) { if (err.status === 401) signedOut('Your session has ended. Please sign in again.'); else { $('api-response').textContent = err.message; $('response-status').textContent = 'Request failed'; } }
  finally { $('test-api').disabled = false; }
};
api('/api/health').then(data => { $('health').textContent = data.mode === 'local-demo' ? 'Local demo' : 'System online'; $('demo-note').hidden = data.mode !== 'local-demo'; }).catch(() => { $('health').textContent = 'Server unavailable'; });
loadAccount().catch(err => { if (err.status !== 401) message('form-message', 'Cannot reach the server. Please try again shortly.'); });
