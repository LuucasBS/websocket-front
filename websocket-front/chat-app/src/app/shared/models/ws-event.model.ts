import { ChatMessage } from './message.model';
import { User } from './user.model';

export type WsEvent =
  | { type: 'MESSAGE'; payload: ChatMessage }
  | { type: 'USER_JOINED'; payload: User }
  | { type: 'USER_LEFT'; payload: { userId: string } }
  | { type: 'CHAT_REQUEST'; payload: { from: User; toUserId?: string } }
  | { type: 'USERS_ONLINE'; payload: User[] }
  | { type: 'TYPING'; payload: { userId: string; isTyping: boolean; toUserId?: string } };
