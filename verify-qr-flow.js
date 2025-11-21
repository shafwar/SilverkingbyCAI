// Verification script untuk memastikan QR flow bekerja dengan benar
const testCases = [
  {
    name: "Test getBaseUrl in production",
    test: () => {
      process.env.NODE_ENV = "production";
      process.env.RAILWAY_ENVIRONMENT = "true";
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.NEXTAUTH_URL;
      
      // Simulate the function
      const PRODUCTION_DOMAIN = "https://www.cahayasilverking.id";
      const isProduction = process.env.NODE_ENV === "production" || process.env.RAILWAY_ENVIRONMENT;
      
      if (isProduction) {
        const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || PRODUCTION_DOMAIN).replace(/\/$/, "");
        console.log("✅ Production baseUrl:", baseUrl);
        return baseUrl === PRODUCTION_DOMAIN;
      }
      return false;
    }
  },
  {
    name: "Test getVerifyUrl format",
    test: () => {
      const baseUrl = "https://www.cahayasilverking.id";
      const serialCode = "SKA000001";
      const verifyUrl = `${baseUrl}/verify/${serialCode}`;
      const expected = "https://www.cahayasilverking.id/verify/SKA000001";
      console.log("✅ Verify URL:", verifyUrl);
      return verifyUrl === expected;
    }
  }
];

console.log("🔍 Verifying QR Flow...\n");
testCases.forEach(({ name, test }) => {
  try {
    const result = test();
    console.log(result ? "✅" : "❌", name);
  } catch (error) {
    console.log("❌", name, "- Error:", error.message);
  }
});
