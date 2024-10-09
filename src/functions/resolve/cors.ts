import httpCors from '@middy/http-cors';

export const cors = httpCors({
    origins: [
      'https://www.opencerts.io',
      'https://dev.opencerts.io'
  ]
});
