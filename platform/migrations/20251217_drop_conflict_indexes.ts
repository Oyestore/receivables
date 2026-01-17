import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropConflictIndexes20251217160500 implements MigrationInterface {
  name = 'DropConflictIndexes20251217160500';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_cd68029afa74f6da673d2db160";');
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op: index will be recreated by schema sync or future migrations if needed
  }
}
