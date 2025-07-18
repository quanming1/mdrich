/**
 * IdGenerator 模块
 * 职责：生成唯一标识符
 * 特点：零依赖，纯函数
 */

export interface IdGeneratorOptions {
  /** 自定义前缀，便于调试和识别 */
  prefix?: string;
  /** 是否包含时间戳，提高调试体验 */
  includeTimestamp?: boolean;
}

/**
 * 生成唯一 ID
 * @param options 配置选项
 * @returns 唯一标识符
 */
export function generateId(options: IdGeneratorOptions = {}): string {
  const { prefix = "mdast", includeTimestamp = false } = options;

  // 使用 crypto.randomUUID() 生成标准 UUID
  const uuid = crypto.randomUUID();

  if (includeTimestamp) {
    const timestamp = Date.now().toString(36); // 36进制时间戳，更紧凑
    return `${prefix}-${timestamp}-${uuid}`;
  }

  return `${prefix}-${uuid}`;
}

/**
 * 生成短 ID（8位随机字符）
 * 适用于不需要全局唯一性的场景
 */
export function generateShortId(prefix: string = "mdast"): string {
  const shortUuid = crypto.randomUUID().slice(0, 8);
  return `${prefix}-${shortUuid}`;
}

/**
 * 批量生成 ID
 * @param count 生成数量
 * @param options 配置选项
 */
export function generateBatchIds(count: number, options: IdGeneratorOptions = {}): string[] {
  return Array.from({ length: count }, () => generateId(options));
}

/**
 * ID 验证器
 * @param id 要验证的 ID
 * @param prefix 期望的前缀
 */
export function isValidId(id: string, prefix: string = "mdast"): boolean {
  if (typeof id !== "string" || !id) return false;

  // 检查前缀
  if (!id.startsWith(`${prefix}-`)) return false;

  // 基本格式验证
  const parts = id.split("-");
  return parts.length >= 2;
}

// 默认导出生成器实例
export const defaultIdGenerator = {
  generate: (options?: IdGeneratorOptions) => generateId(options),
  generateShort: (prefix?: string) => generateShortId(prefix),
  generateBatch: (count: number, options?: IdGeneratorOptions) => generateBatchIds(count, options),
  isValid: (id: string, prefix?: string) => isValidId(id, prefix),
};
