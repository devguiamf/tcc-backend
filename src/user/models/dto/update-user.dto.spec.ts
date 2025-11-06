import { validate } from 'class-validator';
import { UpdateUserDto } from './update-user.dto';
import { UserType } from '../types/user.types';

describe('UpdateUserDto', () => {
  describe('optional fields', () => {
    it('should pass with empty DTO (all fields optional)', async () => {
      const inputDto = new UpdateUserDto();

      const errors = await validate(inputDto);
      expect(errors.length).toBe(0);
    });

    it('should pass with only name updated', async () => {
      const inputDto = new UpdateUserDto();
      inputDto.name = 'Updated Name';

      const errors = await validate(inputDto);
      expect(errors.length).toBe(0);
    });

    it('should pass with only email updated', async () => {
      const inputDto = new UpdateUserDto();
      inputDto.email = 'updated@example.com';

      const errors = await validate(inputDto);
      expect(errors.length).toBe(0);
    });

    it('should pass with only password updated', async () => {
      const inputDto = new UpdateUserDto();
      inputDto.password = 'newpassword123';

      const errors = await validate(inputDto);
      expect(errors.length).toBe(0);
    });

    it('should pass with only cpf updated', async () => {
      const inputDto = new UpdateUserDto();
      inputDto.cpf = '987.654.321-00';

      const errors = await validate(inputDto);
      expect(errors.length).toBe(0);
    });

    it('should pass with only phone updated', async () => {
      const inputDto = new UpdateUserDto();
      inputDto.phone = '+5511888888888';

      const errors = await validate(inputDto);
      expect(errors.length).toBe(0);
    });
  });

  describe('name validation', () => {
    it('should pass with valid name', async () => {
      const inputDto = new UpdateUserDto();
      inputDto.name = 'Updated Name';

      const errors = await validate(inputDto);
      const nameErrors = errors.filter((err) => err.property === 'name');
      expect(nameErrors.length).toBe(0);
    });

    it('should fail with name shorter than 2 characters', async () => {
      const inputDto = new UpdateUserDto();
      inputDto.name = 'A';

      const errors = await validate(inputDto);
      const nameErrors = errors.filter((err) => err.property === 'name');
      expect(nameErrors.length).toBeGreaterThan(0);
    });

    it('should fail with empty name', async () => {
      const inputDto = new UpdateUserDto();
      inputDto.name = '';

      const errors = await validate(inputDto);
      const nameErrors = errors.filter((err) => err.property === 'name');
      expect(nameErrors.length).toBeGreaterThan(0);
    });
  });

  describe('password validation', () => {
    it('should pass with valid password', async () => {
      const inputDto = new UpdateUserDto();
      inputDto.password = 'newpassword123';

      const errors = await validate(inputDto);
      const passwordErrors = errors.filter((err) => err.property === 'password');
      expect(passwordErrors.length).toBe(0);
    });

    it('should fail with password shorter than 6 characters', async () => {
      const inputDto = new UpdateUserDto();
      inputDto.password = '12345';

      const errors = await validate(inputDto);
      const passwordErrors = errors.filter((err) => err.property === 'password');
      expect(passwordErrors.length).toBeGreaterThan(0);
    });
  });

  describe('cpf validation', () => {
    it('should pass with valid CPF format', async () => {
      const inputDto = new UpdateUserDto();
      inputDto.cpf = '123.456.789-00';

      const errors = await validate(inputDto);
      const cpfErrors = errors.filter((err) => err.property === 'cpf');
      expect(cpfErrors.length).toBe(0);
    });

    it('should fail with invalid CPF format', async () => {
      const inputDto = new UpdateUserDto();
      inputDto.cpf = '12345678900';

      const errors = await validate(inputDto);
      const cpfErrors = errors.filter((err) => err.property === 'cpf');
      expect(cpfErrors.length).toBeGreaterThan(0);
    });
  });

  describe('phone validation', () => {
    it('should pass with valid phone format', async () => {
      const inputDto = new UpdateUserDto();
      inputDto.phone = '+5511999999999';

      const errors = await validate(inputDto);
      const phoneErrors = errors.filter((err) => err.property === 'phone');
      expect(phoneErrors.length).toBe(0);
    });

    it('should fail with invalid phone format', async () => {
      const inputDto = new UpdateUserDto();
      inputDto.phone = '12345';

      const errors = await validate(inputDto);
      const phoneErrors = errors.filter((err) => err.property === 'phone');
      expect(phoneErrors.length).toBeGreaterThan(0);
    });
  });

  describe('email validation', () => {
    it('should pass with valid email', async () => {
      const inputDto = new UpdateUserDto();
      inputDto.email = 'updated@example.com';

      const errors = await validate(inputDto);
      const emailErrors = errors.filter((err) => err.property === 'email');
      expect(emailErrors.length).toBe(0);
    });

    it('should fail with invalid email format', async () => {
      const inputDto = new UpdateUserDto();
      inputDto.email = 'invalid-email';

      const errors = await validate(inputDto);
      const emailErrors = errors.filter((err) => err.property === 'email');
      expect(emailErrors.length).toBeGreaterThan(0);
    });
  });

  describe('multiple fields update', () => {
    it('should pass with multiple valid fields', async () => {
      const inputDto = new UpdateUserDto();
      inputDto.name = 'Updated Name';
      inputDto.email = 'updated@example.com';
      inputDto.phone = '+5511888888888';

      const errors = await validate(inputDto);
      expect(errors.length).toBe(0);
    });
  });
});

