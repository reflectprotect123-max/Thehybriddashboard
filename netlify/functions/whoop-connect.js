/**
 * WHOOP connect — restore target for thehybridsystem.netlify.app.
 * Tokens never belong in the repo. Set WHOOP_CLIENT_ID / WHOOP_CLIENT_SECRET
 * in Netlify and point Whoop.ATHLETE_NETLIFY at this site after deploy.
 */
exports.handler = async function () {
  return {
    statusCode: 503,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      error: 'whoop_oauth_not_configured',
      message:
        'Redeploy this Netlify site and set WHOOP_CLIENT_ID / WHOOP_CLIENT_SECRET. Supabase sign-in still works without WHOOP.',
    }),
  };
};
