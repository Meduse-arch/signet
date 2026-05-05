import { supabase } from './auth.service';

export type RelayMessage = {
  session_id: string;
  sender_id: string;
  type: string;
  payload: any;
};

class RelayService {
  private channel: any = null;
  private callbacks: Set<(data: RelayMessage) => void> = new Set();

  public subscribe(sessionId: string, myPeerId: string) {
    if (this.channel) this.unsubscribe();

    console.log(`[RelayService] Abonnement au canal : session-${sessionId}`);
    this.channel = supabase.channel(`session-${sessionId}`, {
      config: {
        broadcast: { self: false },
      },
    });

    this.channel
      .on('broadcast', { event: 'game-event' }, ({ payload }: { payload: RelayMessage }) => {
        if (payload.sender_id !== myPeerId) {
          this.callbacks.forEach(cb => cb(payload));
        }
      })
      .subscribe((status: string) => {
        console.log(`[RelayService] Statut Supabase : ${status}`);
      });
  }

  public send(sessionId: string, myPeerId: string, type: string, payload: any) {
    if (!this.channel) return;

    this.channel.send({
      type: 'broadcast',
      event: 'game-event',
      payload: {
        session_id: sessionId,
        sender_id: myPeerId,
        type,
        payload,
      },
    });
  }

  public onMessage(cb: (data: RelayMessage) => void) {
    this.callbacks.add(cb);
    return () => this.callbacks.delete(cb);
  }

  public unsubscribe() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

export const relayService = new RelayService();
