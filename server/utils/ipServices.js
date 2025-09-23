import axios from 'axios';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 600 });

const CLOUD_PROVIDERS = [
  'amazon', 'aws', 'google', 'gcp', 'ovh', 'digitalocean', 'azure', 'microsoft', 'linode', 'vultr', 'hetzner', 'oracle', 'alibaba', 'upcloud', 'scaleway', 'contabo', 'packet', 'cloud', 'data center', 'datacenter'
];

function isCloudProvider(isp = '', asn = '') {
  const lower = (String(isp) + ' ' + String(asn)).toLowerCase();
  return CLOUD_PROVIDERS.some(p => lower.includes(p));
}

export async function getIpInfo(ip, keys = {}) {
  // Check cache first
  const cached = cache.get(ip);
  if (cached) return cached;

  let geoInfo = {}, asn = '', isp = '', reputationScore = 0, reasons = [], proxyVpn = false;
  let timezoneScore = 0, asnScore = 0, uaScore = 0, latencyScore = 0, webrtcScore = 0;

  // 1. ipapi.co
  try {
    const { data } = await axios.get(`https://ipapi.co/${ip}/json/`);
    geoInfo = {
      country: data.country_name,
      city: data.city,
      region: data.region,
      timezone: data.timezone,
      org: data.org
    };
    asn = data.asn || '';
    isp = data.org || '';
    proxyVpn = data.proxy || data.vpn || false;
    reputationScore = proxyVpn ? 100 : 0;
    if (isCloudProvider(isp, asn)) {
      asnScore = 100;
      reasons.push('Cloud provider ASN/ISP');
    }
    if (proxyVpn) reasons.push('Proxy/VPN flag from ipapi.co');
  } catch (e) {
    reasons.push('ipapi.co failed');
  }

  // 2. ipgeolocation.io (optional)
  if (keys.IPGEO_KEY) {
    try {
      const { data } = await axios.get(`https://api.ipgeolocation.io/ipgeo?apiKey=${keys.IPGEO_KEY}&ip=${ip}`);
      if (data.is_proxy) {
        proxyVpn = true;
        reputationScore = 100;
        reasons.push('Proxy/VPN flag from ipgeolocation.io');
      }
      if (isCloudProvider(data.isp || '', data.asn || '')) {
        asnScore = 100;
        reasons.push('Cloud provider ASN/ISP (ipgeolocation.io)');
      }
      geoInfo = { ...geoInfo, country: data.country_name || geoInfo.country };
      asn = data.asn || asn;
      isp = data.isp || isp;
    } catch (e) {
      reasons.push('ipgeolocation.io failed');
    }
  }

  // 3. freeipapi.com fallback
  try {
    const { data } = await axios.get(`https://freeipapi.com/api/json/${ip}`);
    if (data.proxy) {
      proxyVpn = true;
      reputationScore = 100;
      reasons.push('Proxy/VPN flag from freeipapi.com');
    }
    if (isCloudProvider(data.isp || '', data.asn || '')) {
      asnScore = 100;
      reasons.push('Cloud provider ASN/ISP (freeipapi.com)');
    }
    geoInfo = { ...geoInfo, country: data.countryName || geoInfo.country };
    asn = data.asn || asn;
    isp = data.isp || isp;
  } catch (e) {
    reasons.push('freeipapi.com failed');
  }

  // Compose score (other signals to be added by caller)
  const result = {
    score: reputationScore * 0.42 + asnScore * 0.18 + timezoneScore * 0.12 + webrtcScore * 0.10 + latencyScore * 0.08 + uaScore * 0.10,
    reasons,
    vpnDetected: reputationScore * 0.42 + asnScore * 0.18 + timezoneScore * 0.12 + webrtcScore * 0.10 + latencyScore * 0.08 + uaScore * 0.10 > 70,
    geoInfo,
    asn,
    isp,
    reputationScore,
    asnScore,
    timezoneScore,
    webrtcScore,
    latencyScore,
    uaScore
  };
  cache.set(ip, result);
  return result;
}

export { isCloudProvider, cache };
