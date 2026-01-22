// Test script to verify property creation flow
// Run this with: node test-property-creation.js

const testPropertyCreation = async () => {
  console.log("🧪 Testing Property Creation Flow");
  console.log("=====================================");
  
  const testProperty = {
    name: "Test Property " + Date.now(),
    address: "123 Test Street, Test City",
    landlordName: "Test Landlord",
    landlordPhone: "+254 700 000 000",
    landlordEmail: "test@example.com",
    status: "active"
  };
  
  console.log("📋 Test Property Data:", testProperty);
  
  try {
    console.log("📡 Making API request to create property...");
    
    const response = await fetch('http://localhost:3000/api/properties', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testProperty)
    });
    
    console.log("📡 Response status:", response.status);
    console.log("📡 Response headers:", Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const createdProperty = await response.json();
      console.log("✅ Property created successfully!");
      console.log("📋 Created property:", createdProperty);
      
      // Test fetching the property
      console.log("\n📡 Testing property fetch...");
      const fetchResponse = await fetch('http://localhost:3000/api/properties');
      const properties = await fetchResponse.json();
      console.log("📋 All properties:", properties);
      
      const foundProperty = properties.find(p => p.id === createdProperty.id);
      if (foundProperty) {
        console.log("✅ Property found in database!");
        console.log("📋 Retrieved property:", foundProperty);
      } else {
        console.log("❌ Property not found in database!");
      }
      
    } else {
      const error = await response.text();
      console.log("❌ Property creation failed!");
      console.log("📋 Error response:", error);
    }
    
  } catch (error) {
    console.error("❌ Test failed with error:", error);
  }
  
  console.log("\n🏁 Test completed");
};

// Run the test
testPropertyCreation();
