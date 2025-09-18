// Attempts to enumerate local IPs using WebRTC. Returns Promise<string[]>.
export async function getLocalIPs() {
  return new Promise((resolve) => {
    const ips = new Set();
    // RTCPeerConnection config
    const pc = new window.RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel('');
    pc.onicecandidate = (event) => {
      if (!event || !event.candidate) {
        pc.close();
        resolve(Array.from(ips));
        return;
      }
      const parts = event.candidate.candidate.split(' ');
      const ip = parts[4];
      if (ip && !ips.has(ip)) {
        ips.add(ip);
      }
    };
    pc.createOffer().then((offer) => pc.setLocalDescription(offer)).catch(() => resolve([]));
    // Timeout in case blocked
    setTimeout(() => {
      pc.close();
      resolve(Array.from(ips));
    }, 1500);
  });
}
