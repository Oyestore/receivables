import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';

class AllowAllGuard {
  canActivate() {
    return true;
  }
}

@Module({
  imports: [
    CacheModule.register(),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      dropSchema: true,
      synchronize: true,
      logging: false,
      entities: [],
    }),
  ],
  providers: [
    { provide: APP_GUARD, useClass: AllowAllGuard },
  ],
  exports: [CacheModule],
})
export class AppTestingModule {}
