// scratch/test_nominatim.js

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const queries = [
    'DAIICT Gandhinagar',
    'Dhirubhai Ambani Institute',
    'Dhirubhai Ambani Institute of Information and Communication Technology',
    'DA-IICT Gandhinagar',
    'Racecourse Rajkot',
    'Race Course Rajkot',
    'Racecourse Ground Rajkot',
    'Rajkot Racecourse',
  ];

  const userAgentHeader = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  const viewbox = '72.45,23.35,72.75,22.95'; // Gandhinagar & Ahmedabad area

  for (const q of queries) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=10&countrycodes=in&viewbox=${viewbox}&bounded=0&q=${encodeURIComponent(q)}`;
    try {
      const res = await fetch(url, { headers: userAgentHeader });
      if (res.ok) {
        const data = await res.json();
        console.log(`Query: "${q}" -> Results found: ${data.length}`);
        if (data.length > 0) {
          console.log(`  Top result: "${data[0].display_name}" (${data[0].lat}, ${data[0].lon})`);
        }
      } else {
        console.log(`Query: "${q}" -> Status: ${res.status}`);
      }
    } catch (e) {
      console.log(`Query: "${q}" -> Error: ${e.message}`);
    }
    // Sleep for 1.5 seconds to comply with Nominatim policy
    await sleep(1500);
  }
}

run();
