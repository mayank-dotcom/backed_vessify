import 'dotenv/config'

const BASE_URL = 'http://localhost:3000'

// Sample transaction texts
const SAMPLE_1 = `Date: 11 Dec 2025
Description: STARBUCKS COFFEE MUMBAI
Amount: -420.00
Balance after transaction: 18,420.50`

const SAMPLE_2 = `Uber Ride * Airport Drop
12/11/2025 → ₹1,250.00 debited
Available Balance → ₹17,170.50`

const SAMPLE_3 = `txn123 2025-12-10 Amazon.in Order #403-1234567-8901234 ₹2,999.00 Dr Bal 14171.50 Shopping`

async function testAPI() {
    console.log('🧪 Testing Transaction Parser Backend API\n')

    try {
        // 1. Register
        console.log('1️⃣ Testing Registration...')
        const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: `test${Date.now()}@example.com`,
                password: 'password123',
                name: 'Test User'
            })
        })
        const registerData = await registerRes.json()
        console.log('✅ Registration:', registerData)
        console.log()

        // 2. Login
        console.log('2️⃣ Testing Login...')
        const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: registerData.user.email,
                password: 'password123'
            })
        })
        const loginData = await loginRes.json()
        console.log('✅ Login successful!')
        console.log('Token:', loginData.token.substring(0, 20) + '...')
        console.log('Expires:', loginData.expiresAt)
        console.log('Organizations:', loginData.organizations)
        console.log()

        const token = loginData.token
        const orgId = loginData.organizations[0].id

        // 3. Test Sample 1
        console.log('3️⃣ Testing Sample 1 (Standard Bank Format)...')
        const sample1Res = await fetch(`${BASE_URL}/api/transactions/extract`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Organization-Id': orgId
            },
            body: JSON.stringify({ text: SAMPLE_1 })
        })
        const sample1Data = await sample1Res.json()
        console.log('✅ Sample 1 parsed:', sample1Data.transaction)
        console.log()

        // 4. Test Sample 2
        console.log('4️⃣ Testing Sample 2 (Payment App Format)...')
        const sample2Res = await fetch(`${BASE_URL}/api/transactions/extract`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Organization-Id': orgId
            },
            body: JSON.stringify({ text: SAMPLE_2 })
        })
        const sample2Data = await sample2Res.json()
        console.log('✅ Sample 2 parsed:', sample2Data.transaction)
        console.log()

        // 5. Test Sample 3
        console.log('5️⃣ Testing Sample 3 (Messy Format)...')
        const sample3Res = await fetch(`${BASE_URL}/api/transactions/extract`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Organization-Id': orgId
            },
            body: JSON.stringify({ text: SAMPLE_3 })
        })
        const sample3Data = await sample3Res.json()
        console.log('✅ Sample 3 parsed:', sample3Data.transaction)
        console.log()

        // 6. Get all transactions
        console.log('6️⃣ Testing GET /api/transactions...')
        const transactionsRes = await fetch(`${BASE_URL}/api/transactions?limit=10`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Organization-Id': orgId
            }
        })
        const transactionsData = await transactionsRes.json()
        console.log('✅ Retrieved transactions:', transactionsData.transactions.length)
        console.log('Pagination:', transactionsData.pagination)
        console.log()

        console.log('🎉 All tests passed!')

    } catch (error) {
        console.error('❌ Test failed:', error)
    }
}

testAPI()
