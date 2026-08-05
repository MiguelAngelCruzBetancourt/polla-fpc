export interface OutboxEventRecord {
  id: string;
  type: string;
  payload: Record<string, unknown>;
}

export interface PushMessage {
  uid: string;
  title: string;
  body: string;
}
