import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { UserType } from '../types/user.types';

describe('CreateUserDto', () => {
  describe('name validation', () => {
    it('should pass with valid name', async () => {
      const inputDto = new CreateUserDto();
      inputDto.name = 'John Doe';
      inputDto.email = 'john@example.com';
      inputDto.password = 'password123';
      inputDto.type = UserType.CLIENTE;
      inputDto.phone = '+5511999999999';

      const errors = await validate(inputDto);
      const nameErrors = errors.filter((err) => err.property === 'name');
      expect(nameErrors.length).toBe(0);
    });

    it('should fail with empty name', async () => {
      const inputDto = new CreateUserDto();
      inputDto.name = '';
      inputDto.email = 'john@example.com';
      inputDto.password = 'password123';
      inputDto.type = UserType.CLIENTE;
      inputDto.phone = '+5511999999999';

      const errors = await validate(inputDto);
      const nameErrors = errors.filter((err) => err.property === 'name');
      expect(nameErrors.length).toBeGreaterThan(0);
    });

    it('should fail with name shorter than 2 characters', async () => {
      const inputDto = new CreateUserDto();
      inputDto.name = 'A';
      inputDto.email = 'john@example.com';
      inputDto.password = 'password123';
      inputDto.type = UserType.CLIENTE;
      inputDto.phone = '+5511999999999';

      const errors = await validate(inputDto);
      const nameErrors = errors.filter((err) => err.property === 'name');
      expect(nameErrors.length).toBeGreaterThan(0);
    });

    it('should fail with non-string name', async () => {
      const inputDto = new CreateUserDto();
      (inputDto as any).name = 123;
      inputDto.email = 'john@example.com';
      inputDto.password = 'password123';
      inputDto.type = UserType.CLIENTE;
      inputDto.phone = '+5511999999999';

      const errors = await validate(inputDto);
      const nameErrors = errors.filter((err) => err.property === 'name');
      expect(nameErrors.length).toBeGreaterThan(0);
    });
  });

  describe('email validation', () => {
    it('should pass with valid email', async () => {
      const inputDto = new CreateUserDto();
      inputDto.name = 'John Doe';
      inputDto.email = 'john@example.com';
      inputDto.password = 'password123';
      inputDto.type = UserType.CLIENTE;
      inputDto.phone = '+5511999999999';

      const errors = await validate(inputDto);
      const emailErrors = errors.filter((err) => err.property === 'email');
      expect(emailErrors.length).toBe(0);
    });

    it('should fail with invalid email format', async () => {
      const inputDto = new CreateUserDto();
      inputDto.name = 'John Doe';
      inputDto.email = 'invalid-email';
      inputDto.password = 'password123';
      inputDto.type = UserType.CLIENTE;
      inputDto.phone = '+5511999999999';

      const errors = await validate(inputDto);
      const emailErrors = errors.filter((err) => err.property === 'email');
      expect(emailErrors.length).toBeGreaterThan(0);
    });

    it('should fail with empty email', async () => {
      const inputDto = new CreateUserDto();
      inputDto.name = 'John Doe';
      inputDto.email = '';
      inputDto.password = 'password123';
      inputDto.type = UserType.CLIENTE;
      inputDto.phone = '+5511999999999';

      const errors = await validate(inputDto);
      const emailErrors = errors.filter((err) => err.property === 'email');
      expect(emailErrors.length).toBeGreaterThan(0);
    });
  });

  describe('password validation', () => {
    it('should pass with valid password', async () => {
      const inputDto = new CreateUserDto();
      inputDto.name = 'John Doe';
      inputDto.email = 'john@example.com';
      inputDto.password = 'password123';
      inputDto.type = UserType.CLIENTE;
      inputDto.phone = '+5511999999999';

      const errors = await validate(inputDto);
      const passwordErrors = errors.filter((err) => err.property === 'password');
      expect(passwordErrors.length).toBe(0);
    });

    it('should fail with password shorter than 6 characters', async () => {
      const inputDto = new CreateUserDto();
      inputDto.name = 'John Doe';
      inputDto.email = 'john@example.com';
      inputDto.password = '12345';
      inputDto.type = UserType.CLIENTE;
      inputDto.phone = '+5511999999999';

      const errors = await validate(inputDto);
      const passwordErrors = errors.filter((err) => err.property === 'password');
      expect(passwordErrors.length).toBeGreaterThan(0);
    });

    it('should fail with empty password', async () => {
      const inputDto = new CreateUserDto();
      inputDto.name = 'John Doe';
      inputDto.email = 'john@example.com';
      inputDto.password = '';
      inputDto.type = UserType.CLIENTE;
      inputDto.phone = '+5511999999999';

      const errors = await validate(inputDto);
      const passwordErrors = errors.filter((err) => err.property === 'password');
      expect(passwordErrors.length).toBeGreaterThan(0);
    });
  });

  describe('type validation', () => {
    it('should pass with valid CLIENTE type', async () => {
      const inputDto = new CreateUserDto();
      inputDto.name = 'John Doe';
      inputDto.email = 'john@example.com';
      inputDto.password = 'password123';
      inputDto.type = UserType.CLIENTE;
      inputDto.phone = '+5511999999999';

      const errors = await validate(inputDto);
      const typeErrors = errors.filter((err) => err.property === 'type');
      expect(typeErrors.length).toBe(0);
    });

    it('should pass with valid PRESTADOR type', async () => {
      const inputDto = new CreateUserDto();
      inputDto.name = 'Jane Provider';
      inputDto.email = 'jane@example.com';
      inputDto.password = 'password123';
      inputDto.type = UserType.PRESTADOR;
      inputDto.cpf = '123.456.789-00';

      const errors = await validate(inputDto);
      const typeErrors = errors.filter((err) => err.property === 'type');
      expect(typeErrors.length).toBe(0);
    });

    it('should fail with invalid type', async () => {
      const inputDto = new CreateUserDto();
      inputDto.name = 'John Doe';
      inputDto.email = 'john@example.com';
      inputDto.password = 'password123';
      (inputDto as any).type = 'invalid-type';
      inputDto.phone = '+5511999999999';

      const errors = await validate(inputDto);
      const typeErrors = errors.filter((err) => err.property === 'type');
      expect(typeErrors.length).toBeGreaterThan(0);
    });
  });

  describe('cpf validation', () => {
    it('should pass with valid CPF format', async () => {
      const inputDto = new CreateUserDto();
      inputDto.name = 'Jane Provider';
      inputDto.email = 'jane@example.com';
      inputDto.password = 'password123';
      inputDto.type = UserType.PRESTADOR;
      inputDto.cpf = '123.456.789-00';

      const errors = await validate(inputDto);
      const cpfErrors = errors.filter((err) => err.property === 'cpf');
      expect(cpfErrors.length).toBe(0);
    });

    it('should fail with invalid CPF format', async () => {
      const inputDto = new CreateUserDto();
      inputDto.name = 'Jane Provider';
      inputDto.email = 'jane@example.com';
      inputDto.password = 'password123';
      inputDto.type = UserType.PRESTADOR;
      inputDto.cpf = '12345678900';

      const errors = await validate(inputDto);
      const cpfErrors = errors.filter((err) => err.property === 'cpf');
      expect(cpfErrors.length).toBeGreaterThan(0);
    });

    it('should pass without CPF (optional field)', async () => {
      const inputDto = new CreateUserDto();
      inputDto.name = 'John Doe';
      inputDto.email = 'john@example.com';
      inputDto.password = 'password123';
      inputDto.type = UserType.CLIENTE;
      inputDto.phone = '+5511999999999';

      const errors = await validate(inputDto);
      const cpfErrors = errors.filter((err) => err.property === 'cpf');
      expect(cpfErrors.length).toBe(0);
    });
  });

  describe('phone validation', () => {
    it('should pass with valid phone format with country code', async () => {
      const inputDto = new CreateUserDto();
      inputDto.name = 'John Doe';
      inputDto.email = 'john@example.com';
      inputDto.password = 'password123';
      inputDto.type = UserType.CLIENTE;
      inputDto.phone = '+5511999999999';

      const errors = await validate(inputDto);
      const phoneErrors = errors.filter((err) => err.property === 'phone');
      expect(phoneErrors.length).toBe(0);
    });

    it('should pass with valid phone format without country code', async () => {
      const inputDto = new CreateUserDto();
      inputDto.name = 'John Doe';
      inputDto.email = 'john@example.com';
      inputDto.password = 'password123';
      inputDto.type = UserType.CLIENTE;
      inputDto.phone = '11999999999';

      const errors = await validate(inputDto);
      const phoneErrors = errors.filter((err) => err.property === 'phone');
      expect(phoneErrors.length).toBe(0);
    });

    it('should fail with invalid phone format', async () => {
      const inputDto = new CreateUserDto();
      inputDto.name = 'John Doe';
      inputDto.email = 'john@example.com';
      inputDto.password = 'password123';
      inputDto.type = UserType.CLIENTE;
      inputDto.phone = '12345';

      const errors = await validate(inputDto);
      const phoneErrors = errors.filter((err) => err.property === 'phone');
      expect(phoneErrors.length).toBeGreaterThan(0);
    });

    it('should pass without phone (optional field)', async () => {
      const inputDto = new CreateUserDto();
      inputDto.name = 'Jane Provider';
      inputDto.email = 'jane@example.com';
      inputDto.password = 'password123';
      inputDto.type = UserType.PRESTADOR;
      inputDto.cpf = '123.456.789-00';

      const errors = await validate(inputDto);
      const phoneErrors = errors.filter((err) => err.property === 'phone');
      expect(phoneErrors.length).toBe(0);
    });
  });

  describe('complete valid DTO', () => {
    it('should pass validation with all required fields for CLIENTE', async () => {
      const inputDto = new CreateUserDto();
      inputDto.name = 'John Doe';
      inputDto.email = 'john@example.com';
      inputDto.password = 'password123';
      inputDto.type = UserType.CLIENTE;
      inputDto.phone = '+5511999999999';

      const errors = await validate(inputDto);
      expect(errors.length).toBe(0);
    });

    it('should pass validation with all required fields for PRESTADOR', async () => {
      const inputDto = new CreateUserDto();
      inputDto.name = 'Jane Provider';
      inputDto.email = 'jane@example.com';
      inputDto.password = 'password123';
      inputDto.type = UserType.PRESTADOR;
      inputDto.cpf = '123.456.789-00';

      const errors = await validate(inputDto);
      expect(errors.length).toBe(0);
    });
  });
});

