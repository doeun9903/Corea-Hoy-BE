import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './lib/swagger';
import { prisma } from './lib/prisma';
import { errorHandler } from './middlewares/error.middleware';
import router from './routes';

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      defaultModelsExpandDepth: -1,
    },
  }),
);

app.use('/api', router);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// superbase 비활성화 방지용
// Render 헬스체크 경로로는 쓰지 않는다. DB가 잠깐 느려질 때 서버가 재시작되는 걸 막기 위함.
app.get('/health/db', async (req, res) => {
  const started = Date.now();
  res.set('Cache-Control', 'no-store');
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'ok', latencyMs: Date.now() - started });
  } catch (err) {
    console.error('[health/db] DB 연결 실패', err);
    res.status(503).json({ status: 'error', db: 'unreachable' });
  }
});

app.use(errorHandler);

export default app;
