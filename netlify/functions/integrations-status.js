exports.handler = async function () {
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ok: true, connected: false, provider: 'whoop', note: 'Sign in via Supabase; WHOOP OAuth pending Netlify secrets.' }),
  };
};
