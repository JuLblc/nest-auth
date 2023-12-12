import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOptions: CorsOptions = {
    origin: "http://localhost:3333", // Remplacez par l'URL de votre front-end
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true, // Activez les cookies cross-origin (si nécessaire)
  };

  app.enableCors(corsOptions);

  const port = Number(process.env.PORT) || 8080;
  await app.listen(port);
  console.log(
    `⚡⚡⚡⚡⚡ Server started on http://localhost:${port} ⚡⚡⚡⚡⚡`
  );
}
bootstrap();
