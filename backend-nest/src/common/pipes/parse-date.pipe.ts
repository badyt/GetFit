import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseDatePipe implements PipeTransform<string, Date> {
  transform(value: string): Date {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new BadRequestException(
        `Invalid date format: "${value}". Expected ISO 8601 (e.g. 2024-01-15)`,
      );
    }
    return date;
  }
}
