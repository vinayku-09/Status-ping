let appPromise;

async function getApp() {
  if (!appPromise) {
    appPromise = import('../dist/api/app.js').then(({ createApp }) => createApp());
  }
  return appPromise;
}

export default async function handler(req, res) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (error) {
    appPromise = undefined;

    const detail = error instanceof Error ? error.message : String(error);
    console.error('StatusPing function initialization failed:', error);

    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(
        JSON.stringify({
          error: {
            code: 'FUNCTION_INIT_FAILED',
            message: 'Backend failed to initialize. Check Vercel function logs.',
            detail,
          },
        })
      );
    }
  }
}
