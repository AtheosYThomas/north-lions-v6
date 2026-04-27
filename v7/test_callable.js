const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('http://127.0.0.1:5003/north-lions-v6-a7757/us-central1/verifyLineToken', {
      data: { lineAccessToken: "dummy-token" }
    });
    console.log("Success:", res.data);
  } catch (e) {
    console.error("Error:", e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
  }
}
test();
