import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePasswordResetCodesTable1762125506392 implements MigrationInterface {
    name = 'CreatePasswordResetCodesTable1762125506392'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`password_reset_codes\` (\`id\` varchar(36) NOT NULL, \`email\` varchar(255) NOT NULL, \`code\` varchar(100) NOT NULL, \`expiresAt\` datetime NOT NULL, \`isUsed\` tinyint NOT NULL DEFAULT 0, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_3a2204bbed360cd62320bf0c77\` (\`email\`), UNIQUE INDEX \`IDX_f1399d5463bc09f8075a5739da\` (\`code\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_f1399d5463bc09f8075a5739da\` ON \`password_reset_codes\``);
        await queryRunner.query(`DROP INDEX \`IDX_3a2204bbed360cd62320bf0c77\` ON \`password_reset_codes\``);
        await queryRunner.query(`DROP TABLE \`password_reset_codes\``);
    }

}
