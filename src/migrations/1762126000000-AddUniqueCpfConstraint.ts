import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueCpfConstraint1762126000000 implements MigrationInterface {
    name = 'AddUniqueCpfConstraint1762126000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` ADD UNIQUE INDEX \`IDX_users_cpf\` (\`cpf\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` DROP INDEX \`IDX_users_cpf\``);
    }

}

