import axios from 'axios';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 600 });

function isPrivate(ip) {
  const parts = ip.split('.').map(part => parseInt(part, 10));
  return parts[0] === 10 || 
         (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
         (parts[0] === 192 && parts[1] === 168) ||
         ip === '127.0.0.1';
}

const CLOUD_PROVIDERS = [
  'amazon', 'aws', 'google', 'gcp', 'ovh', 'digitalocean', 'azure', 'microsoft', 'linode', 'vultr', 'hetzner', 'oracle', 'alibaba', 'upcloud', 'scaleway', 'contabo', 'packet', 'cloud', 'data center', 'datacenter'
];

function isCloudProvider(isp = '', asn = '') {
  const lower = (String(isp) + ' ' + String(asn)).toLowerCase();
  return CLOUD_PROVIDERS.some(p => lower.includes(p));
}

export async function getIpInfo(ip, keys = {}, headers = {}) {
  // Check cache first
  const cached = cache.get(ip);
  if (cached) return cached;

  let geoInfo = {}, asn = '', isp = '', reputationScore = 0, reasons = [], proxyVpn = false;
  let timezoneScore = 0, asnScore = 0, uaScore = 0, latencyScore = 0, webrtcScore = 0;
  
  // Get real IP from headers
  const realIp = headers['cf-connecting-ip'] || 
                 headers['x-real-ip'] || 
                 headers['x-forwarded-for']?.split(',')[0] || 
                 ip;
  
  // Check if IP is private
  const isPrivateIp = isPrivate(realIp);
  if (isPrivateIp) {
    reasons.push('Private IP detected');
    reputationScore += 50;
  }

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
    reputationScore += 80;
    reasons.push('Cloud provider ASN/ISP');
  }
  if (proxyVpn) {
    reasons.push('Proxy/VPN flag from ipapi.co');
    reputationScore += 90;
  }
  
  // Additional heuristic checks
  if (headers['user-agent']) {
    const ua = headers['user-agent'].toLowerCase();
    if (ua.includes('tor') || ua.includes('wget') || ua.includes('curl')) {
      uaScore = 100;
      reputationScore += 70;
      reasons.push('Suspicious User-Agent detected');
    }
  }
  
  // WebRTC leak check result from frontend
  if (headers['x-webrtc-ip'] && headers['x-webrtc-ip'] !== ip) {
    webrtcScore = 100;
    reputationScore += 85;
    reasons.push('WebRTC IP mismatch detected');
  }
  } catch (e) {
    reasons.push('ipapi.co failed');
    // Fallback to ip-api.com (free, no key required)
    try {
      const { data } = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,timezone,isp,org,as,proxy,hosting`);
      if (data.status === 'success') {
        geoInfo = {
          country: data.country,
          city: data.city,
          region: data.regionName,
          timezone: data.timezone,
          org: data.org
        };
        asn = data.as || '';
        isp = data.isp || '';
        if (data.proxy || data.hosting) {
          proxyVpn = true;
          reputationScore += 75;
          reasons.push('Proxy/VPN/Hosting detected by ip-api.com');
        }
      }
    } catch (e) {
      reasons.push('ip-api.com failed');
    }
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

  // Normalize reputation score
  reputationScore = Math.min(100, reputationScore);
  
  // Calculate final risk score with weighted factors
  const finalScore = reputationScore * 0.40 + 
                    asnScore * 0.20 + 
                    timezoneScore * 0.10 + 
                    webrtcScore * 0.15 + 
                    latencyScore * 0.05 + 
                    uaScore * 0.10;

  // Compose final result
  const result = {
    score: finalScore,
    reasons,
    vpnDetected: finalScore > 70,
    isProxy: proxyVpn,
    isSuspicious: finalScore > 50,
    ipInfo: {
      detectedIp: realIp,
      originalIp: ip,
      isPrivate: isPrivateIp,
    },
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
