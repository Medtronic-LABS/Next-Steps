import https from 'https';

function fetchChunk(name) {
  return new Promise((resolve) => {
    https.get(`https://insights.cce.mdtlabs.org/${name}`, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data));
    });
  });
}

async function main() {
  const [protoAnalytics, deviations] = await Promise.all([
    fetchChunk('assets/ProtocolAnalytics-Ckn3zrNe.js'),
    fetchChunk('assets/Deviations-zBnX6clh.js'),
  ]);

  console.log('=== ProtocolAnalytics ===');
  console.log(protoAnalytics.slice(0, 2000));
}

main();
