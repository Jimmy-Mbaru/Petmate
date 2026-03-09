import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    description:
      'New status for the order: PLACED, PAID, PROCESSING, SHIPPED, DELIVERED, or CANCELLED',
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}

