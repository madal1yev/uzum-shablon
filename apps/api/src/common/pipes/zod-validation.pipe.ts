import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { z, type ZodTypeAny } from 'zod';

/** Zod sxemasi orqali kiruvchi ma'lumotni tekshiradi. Noto'g'ri bo'lsa 400 qaytaradi. */
@Injectable()
export class ZodValidationPipe<T extends ZodTypeAny> implements PipeTransform<unknown, z.infer<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        field: i.path.join('.') || '(root)',
        message: i.message,
      }));
      throw new BadRequestException({ message: issues, error: 'Validation failed' });
    }
    return result.data;
  }
}
