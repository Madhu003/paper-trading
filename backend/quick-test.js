const { NseIndia } = require('stock-nse-india');
const nseIndia = new NseIndia();

async function test() {
  console.log('Starting test...');
  try {
    const start = Date.now();
    const details = await nseIndia.getEquityDetails('RELIANCE');
    console.log('Reliance Price:', details.priceInfo.lastPrice);
    console.log('Time taken:', Date.now() - start, 'ms');
  } catch (e) {
    console.error('Error:', e.message);
  }
}

test();
