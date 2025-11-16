import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { IsString, IsNotEmpty } from 'class-validator';
import { UsdcTransform } from './usdc-transform.decorator';

class TestDto {
  @UsdcTransform()
  @IsString()
  @IsNotEmpty()
  amount: string;
}

describe('UsdcTransform', () => {
  it('should convert decimal USDC to micro USDC', () => {
    const dto = plainToClass(TestDto, { amount: '999.99' });
    expect(dto.amount).toBe('999990000');
  });

  it('should convert integer USDC to micro USDC', () => {
    const dto = plainToClass(TestDto, { amount: '1000' });
    expect(dto.amount).toBe('1000000000');
  });

  it('should handle USDC with up to 6 decimals', () => {
    const dto = plainToClass(TestDto, { amount: '1.123456' });
    expect(dto.amount).toBe('1123456');
  });

  it('should truncate USDC with more than 6 decimals', () => {
    const dto = plainToClass(TestDto, { amount: '1.1234567890' });
    expect(dto.amount).toBe('1123456');
  });

  it('should handle zero', () => {
    const dto = plainToClass(TestDto, { amount: '0' });
    expect(dto.amount).toBe('0');
  });

  it('should handle zero with decimals', () => {
    const dto = plainToClass(TestDto, { amount: '0.50' });
    expect(dto.amount).toBe('500000');
  });

  it('should keep already formatted micro USDC unchanged', () => {
    const dto = plainToClass(TestDto, { amount: '1000000000' });
    expect(dto.amount).toBe('1000000000');
  });

  it('should handle large decimal amounts', () => {
    const dto = plainToClass(TestDto, { amount: '123456.789' });
    expect(dto.amount).toBe('123456789000');
  });

  it('should handle comma-separated numbers', () => {
    const dto = plainToClass(TestDto, { amount: '10,000.50' });
    expect(dto.amount).toBe('10000500000');
  });

  it('should handle comma-separated micro USDC', () => {
    const dto = plainToClass(TestDto, { amount: '10,000000000' });
    expect(dto.amount).toBe('10000000000');
  });

  it('should handle multiple commas', () => {
    const dto = plainToClass(TestDto, { amount: '123,456.78' });
    expect(dto.amount).toBe('123456780000');
  });

  it('should throw error on invalid format with multiple decimals', () => {
    expect(() => {
      plainToClass(TestDto, { amount: '1.2.3' });
    }).toThrow('Invalid USDC amount format');
  });

  it('should throw error on invalid characters', () => {
    expect(() => {
      plainToClass(TestDto, { amount: 'abc123' });
    }).toThrow('Invalid USDC amount format');
  });
});
