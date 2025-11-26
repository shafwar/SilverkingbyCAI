const { S3Client, ListBucketsCommand } = require("@aws-sdk/client-s3");

const R2_ENDPOINT = "https://bfa93ec5dc81d8265a89844539388b2a.r2.cloudflarestorage.com";
const R2_ACCESS_KEY_ID = "5824420d9b9f5a7d42974000a64a731e";
const R2_SECRET_ACCESS_KEY = "38893da6a29ff59cef1fcff756472833e37001a51a304b16e6393e4497647c5f";
const R2_BUCKET = "silverking-assets";

const r2Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function testConnection() {
  try {
    console.log("Testing R2 connection...");
    console.log("Endpoint:", R2_ENDPOINT);
    console.log("Bucket:", R2_BUCKET);
    
    const command = new ListBucketsCommand({});
    const response = await r2Client.send(command);
    
    console.log("✅ R2 Connection successful!");
    console.log("Buckets:", response.Buckets?.map(b => b.Name));
  } catch (error) {
    console.error("❌ R2 Connection failed:", error.message);
    console.error("Error details:", error);
  }
}

testConnection();
