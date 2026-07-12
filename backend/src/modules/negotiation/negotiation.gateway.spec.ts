import { NegotiationGateway } from './negotiation.gateway';

describe('NegotiationGateway', () => {
  function createGateway() {
    return new NegotiationGateway(
      { verify: jest.fn() } as never,
      { get: jest.fn() } as never,
      { findOne: jest.fn() } as never,
    );
  }

  it('does not throw when websocket server is not ready', () => {
    const gateway = createGateway();

    expect(() => {
      gateway.emitConversationEvent('conversation-1', 'message:new', {
        id: 'message-1',
      });
    }).not.toThrow();
  });

  it('emits to the conversation room when websocket server is ready', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    const gateway = createGateway();

    gateway.server = { to } as never;
    gateway.emitConversationEvent('conversation-1', 'message:new', {
      id: 'message-1',
    });

    expect(to).toHaveBeenCalledWith('conversation:conversation-1');
    expect(emit).toHaveBeenCalledWith('message:new', { id: 'message-1' });
  });
});
