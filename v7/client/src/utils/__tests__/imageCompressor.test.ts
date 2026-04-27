import { describe, it, expect, vi } from 'vitest';
import { compressImage } from '../imageCompressor';

// 模擬 browser-image-compression 的行為
vi.mock('browser-image-compression', () => {
  return {
    default: vi.fn(async (file: File, _options: any) => {
      // 模擬壓縮過程，回傳被限制在一定大小內的 Blob
      // 假設我們將原本巨大的檔案強制壓到約 400KB 的大小
      const compressedSize = Math.min(file.size, 400 * 1024);
      return new Blob([new ArrayBuffer(compressedSize)], { type: file.type });
    })
  };
});

describe('📉 圖片壓縮引擎極限測試', () => {
  it('[巨獸檔案模擬] 壓縮 15MB 的虛擬 File 物件，不得拋錯且必須小於 500KB', async () => {
    // 建立 15MB 大的虛擬緩衝區
    const largeBuffer = new ArrayBuffer(15 * 1024 * 1024);
    const mockFile = new File([largeBuffer], 'giant-image.jpg', { type: 'image/jpeg' });

    // 驗證檔案確定是 15MB 巨嬰
    expect(mockFile.size).toBe(15 * 1024 * 1024);

    // 執行壓縮邏輯，不應報錯
    const compressedFile = await compressImage(mockFile);

    expect(compressedFile).toBeDefined();

    // 驗證產生的 File/Blob 被定錨在 500KB (512,000 bytes) 以內
    expect(compressedFile.size).toBeLessThanOrEqual(500 * 1024);
    
    // 驗證是否完整保留原本的檔案名稱與 Type
    expect(compressedFile.name).toBe('giant-image.jpg');
    expect(compressedFile.type).toBe('image/jpeg');
  });
});
