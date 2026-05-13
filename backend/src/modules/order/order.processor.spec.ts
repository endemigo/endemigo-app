import { OrderProcessor } from './order.processor';

describe('OrderProcessor', () => {
  it('auto-confirms delivery for known job type', async () => {
    const orderService = {
      autoConfirmDelivery: jest.fn().mockResolvedValue(undefined),
    };
    const processor = new OrderProcessor(orderService as never);

    await processor.process({
      name: 'auto-confirm-delivery',
      data: { orderId: 'order-1' },
    } as never);

    expect(orderService.autoConfirmDelivery).toHaveBeenCalledWith('order-1');
  });

  it('rethrows errors from order service', async () => {
    const orderService = {
      autoConfirmDelivery: jest.fn().mockRejectedValue(new Error('job-failed')),
    };
    const processor = new OrderProcessor(orderService as never);

    await expect(
      processor.process({
        name: 'auto-confirm-delivery',
        data: { orderId: 'order-2' },
      } as never),
    ).rejects.toThrow('job-failed');
  });
});
