import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockReportService } from '../block-report/block-report.service';

const senderId = '550e8400-e29b-41d4-a716-446655440000';
const receiverId = '660e8400-e29b-41d4-a716-446655440001';
const mockMessageId = '770e8400-e29b-41d4-a716-446655440002';

describe('ChatService', () => {
  let service: ChatService;
  let prisma: jest.Mocked<PrismaService>;

  const mockMessage = {
    id: mockMessageId,
    senderId,
    receiverId,
    content: 'Hello',
    read: false,
    sentAt: new Date(),
    sender: { id: senderId, name: 'Alice' },
    receiver: { id: receiverId, name: 'Bob' },
  };

  beforeEach(async () => {
    const mockPrisma = {
      message: {
        findMany: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: BlockReportService,
          useValue: { isBlocked: jest.fn().mockResolvedValue(false) },
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    jest.clearAllMocks();
  });

  describe('getHistory', () => {
    it('should return messages between two users', async () => {
      (prisma.message.findMany as jest.Mock).mockResolvedValue([mockMessage]);

      const result = await service.getHistory(senderId, receiverId);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Hello');
      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { senderId, receiverId },
            { senderId: receiverId, receiverId: senderId },
          ],
        },
        include: expect.any(Object),
        orderBy: { sentAt: 'asc' },
      });
    });
  });

  describe('saveMessage', () => {
    it('should create message when receiver exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: receiverId,
        name: 'Bob',
      });
      (prisma.message.create as jest.Mock).mockResolvedValue(mockMessage);

      const result = await service.saveMessage(senderId, receiverId, 'Hello');

      expect(result).toEqual(mockMessage);
      expect(prisma.message.create).toHaveBeenCalledWith({
        data: { senderId, receiverId, content: 'Hello' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when receiver does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.saveMessage(senderId, '00000000-0000-0000-0000-000000000000', 'Hi')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.saveMessage(senderId, '00000000-0000-0000-0000-000000000000', 'Hi')).rejects.toThrow(
        'Receiver not found',
      );
      expect(prisma.message.create).not.toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('should update messages to read', async () => {
      (prisma.message.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await service.markAsRead(receiverId, senderId);

      expect(result).toEqual({ success: true });
      expect(prisma.message.updateMany).toHaveBeenCalledWith({
        where: { receiverId, senderId, read: false },
        data: { read: true },
      });
    });
  });
});
