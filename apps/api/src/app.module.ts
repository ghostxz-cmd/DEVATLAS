import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupportModule } from './support/support.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), SupportModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
