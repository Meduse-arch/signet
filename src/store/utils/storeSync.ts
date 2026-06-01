const channels: Record<string, BroadcastChannel> = {};

export function getSyncChannel(storeName: string, sessionId: string): BroadcastChannel {
  const channelName = `signet_${storeName}_store_sync_${sessionId}`;
  if (!channels[channelName]) {
    channels[channelName] = new BroadcastChannel(channelName);
  }
  return channels[channelName];
}

export function setupStoreSync(
  storeName: string,
  sessionId: string,
  onSync: (type: string, payload: any) => void | Promise<void>
) {
  const syncChannel = getSyncChannel(storeName, sessionId);
  
  syncChannel.onmessage = async (event) => {
    const { type, payload } = event.data;
    await onSync(type, payload);
  };
}

export function emitStoreSync(storeName: string, sessionId: string, type: string, payload?: any) {
  const syncChannel = getSyncChannel(storeName, sessionId);
  syncChannel.postMessage({ type, payload });
}
