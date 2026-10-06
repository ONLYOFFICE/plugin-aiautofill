interface ButtonContext {
    id: number | string;
    windowId: string;
}

type ButtonHandler = (context: ButtonContext) => boolean | void;
type MessageHandler = (action: string, data: Record<string, unknown>) => boolean | void;

interface AutofillerEventBus {
    sendPluginEvent(eventName: string, data: unknown): boolean;
    executeCommand(command: string, params?: string): boolean;
    closePlugin(): boolean;
    postToParent(message: unknown, origin?: string): boolean;
    attachPluginEvent(eventName: string, callback: (...args: unknown[]) => void): boolean;
    on(eventType: 'button', handler: ButtonHandler): boolean;
    on(eventType: 'message', handler: MessageHandler): boolean;
    off(eventType: 'button', handler: ButtonHandler): boolean;
    off(eventType: 'message', handler: MessageHandler): boolean;
    clear(eventType?: 'button' | 'message'): boolean;
    sendAndClose(config: {
        source: string;
        action: string;
        eventName: string;
        eventData?: Record<string, unknown>;
        beforeClose?: () => void;
    }): void;
}
