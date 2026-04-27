import { describe, it, expect } from 'vitest';
import { escapeCsv } from '../csv';

describe('CSV 格式跳脫極限測試 (RFC 4180 規範驗證)', () => {
  it('[毒藥 A：逗號與換行陷阱] 傳入資料：Name: "Lion, King", Memo: "第一行\\n第二行"', () => {
    expect(escapeCsv('Lion, King')).toBe('"Lion, King"');
    expect(escapeCsv('第一行\n第二行')).toBe('"第一行\n第二行"');
  });

  it('[毒藥 B：引號中的引號] 傳入資料：Title: 獅子會 "VVIP" 會員', () => {
    expect(escapeCsv('獅子會 "VVIP" 會員')).toBe('"獅子會 ""VVIP"" 會員"');
  });

  it('一般無特殊字元的字串', () => {
    expect(escapeCsv('會員A')).toBe('"會員A"');
  });

  it('Null 或 Undefined 處理', () => {
    expect(escapeCsv(null)).toBe('""');
    expect(escapeCsv(undefined)).toBe('""');
  });
});
