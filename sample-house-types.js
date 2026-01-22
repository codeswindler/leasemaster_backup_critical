// Sample data for testing the Houses module
const sampleHouseTypes = [
  {
    name: "Bedsitter",
    description: "Single room with kitchenette and bathroom",
    baseRentAmount: "15000",
    waterRatePerUnit: "15.50",
    isActive: "true"
  },
  {
    name: "1 Bedroom",
    description: "One bedroom apartment with living room, kitchen and bathroom",
    baseRentAmount: "25000",
    waterRatePerUnit: "15.50",
    isActive: "true"
  },
  {
    name: "2 Bedroom",
    description: "Two bedroom apartment with living room, kitchen and bathroom",
    baseRentAmount: "35000",
    waterRatePerUnit: "15.50",
    isActive: "true"
  },
  {
    name: "3 Bedroom",
    description: "Three bedroom apartment with living room, kitchen and bathroom",
    baseRentAmount: "45000",
    waterRatePerUnit: "15.50",
    isActive: "true"
  }
]

// You can run this in the browser console to add sample data:
// sampleHouseTypes.forEach(async (houseType) => {
//   await fetch('/api/house-types', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(houseType)
//   })
// })
