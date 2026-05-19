import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PortfolioModule } from './portfolio/portfolio.module';
import { AuthModule } from './auth/auth.module';
import { CrmModule } from './crm/crm.module';
import { RentaModule } from './renta/renta.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    PortfolioModule,
    CrmModule,
    RentaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

