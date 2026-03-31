export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

export interface ChatMessage {
  id: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  timestamp: string;
  status: MessageStatus;
}
