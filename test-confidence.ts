import { parseTransaction } from './src/lib/parser'

const SAMPLE_1 = `Date: 11 Dec 2025
Description: STARBUCKS COFFEE MUMBAI
Amount: -420.00
Balance after transaction: 18,420.50`

const SAMPLE_2 = `Uber Ride * Airport Drop
12/11/2025 → ₹1,250.00 debited
Available Balance → ₹17,170.50`

const SAMPLE_3 = `txn123 2025-12-10 Amazon.in Order #403-1234567-8901234 ₹2,999.00 Dr Bal 14171.50 Shopping`

console.log('Testing Transaction Parser Confidence Scores\n')

console.log('Sample 1 (Standard Bank Format):')
const result1 = parseTransaction(SAMPLE_1)
if (result1.success && result1.data) {
    console.log(`✅ Confidence: ${result1.data.confidence}%`)
    console.log(`   Date: ${result1.data.date.toISOString().split('T')[0]}`)
    console.log(`   Description: ${result1.data.description}`)
    console.log(`   Amount: ${result1.data.amount}`)
    console.log(`   Balance: ${result1.data.balance}\n`)
}

console.log('Sample 2 (Payment App Format):')
const result2 = parseTransaction(SAMPLE_2)
if (result2.success && result2.data) {
    console.log(`✅ Confidence: ${result2.data.confidence}%`)
    console.log(`   Date: ${result2.data.date.toISOString().split('T')[0]}`)
    console.log(`   Description: ${result2.data.description}`)
    console.log(`   Amount: ${result2.data.amount}`)
    console.log(`   Balance: ${result2.data.balance}\n`)
}

console.log('Sample 3 (Messy Format):')
const result3 = parseTransaction(SAMPLE_3)
if (result3.success && result3.data) {
    console.log(`✅ Confidence: ${result3.data.confidence}%`)
    console.log(`   Date: ${result3.data.date.toISOString().split('T')[0]}`)
    console.log(`   Description: ${result3.data.description}`)
    console.log(`   Amount: ${result3.data.amount}`)
    console.log(`   Balance: ${result3.data.balance}\n`)
}

if (result1.data?.confidence === 100 && result2.data?.confidence === 100 && result3.data?.confidence === 100) {
    console.log('🎉 All samples achieved 100% confidence!')
} else {
    console.log('❌ Not all samples achieved 100% confidence')
}
