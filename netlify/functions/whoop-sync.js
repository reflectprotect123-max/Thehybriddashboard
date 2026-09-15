exports.handler = async function () {
  return {
    statusCode: 503,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ error: 'whoop_sync_not_configured', message: 'WHOOP proxy not wired on this deploy.' }),
  };
};
