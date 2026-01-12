export interface ParsedTransaction {
    date: Date
    description: string
    amount: number
    balance: number | null
    confidence: number
}

export interface ParserResult {
    success: boolean
    data?: ParsedTransaction
    error?: string
}

/**
 * Parses transaction text from various bank statement formats
 * Supports:
 * 1. Standard bank format (Date, Description, Amount, Balance)
 * 2. Payment app format (Uber Ride, date → amount)
 * 3. Messy format (txn ID, mixed order fields)
 */
export function parseTransaction(rawText: string): ParserResult {
    const text = rawText.trim()

    // Try Format 1: Standard bank format
    const format1Result = parseFormat1(text)
    if (format1Result.success) return format1Result

    // Try Format 2: Payment app format
    const format2Result = parseFormat2(text)
    if (format2Result.success) return format2Result

    // Try Format 3: Messy format
    const format3Result = parseFormat3(text)
    if (format3Result.success) return format3Result

    return {
        success: false,
        error: 'Unable to parse transaction - format not recognized'
    }
}

/**
 * Format 1: Standard Bank Format
 * Example:
 * Date: 11 Dec 2025
 * Description: STARBUCKS COFFEE MUMBAI
 * Amount: -420.00
 * Balance after transaction: 18,420.50
 */
function parseFormat1(text: string): ParserResult {
    const dateMatch = text.match(/Date:\s*(\d{1,2}\s+\w+\s+\d{4})/i)
    const descMatch = text.match(/Description:\s*(.+?)(?=\n|Amount:|$)/i)
    const amountMatch = text.match(/Amount:\s*([-+]?[\d,]+\.?\d*)/i)
    const balanceMatch = text.match(/Balance.*?:\s*([\d,]+\.?\d*)/i)

    if (!dateMatch || !descMatch || !amountMatch) {
        return { success: false }
    }

    try {
        const date = parseDate(dateMatch[1])
        const description = descMatch[1].trim()
        const amount = parseAmount(amountMatch[1])
        const balance = balanceMatch ? parseAmount(balanceMatch[1]) : null

        // All required fields extracted successfully = 100% confidence
        const confidence = 100

        return {
            success: true,
            data: { date, description, amount, balance, confidence }
        }
    } catch (error) {
        return { success: false }
    }
}

/**
 * Format 2: Payment App Format
 * Example:
 * Uber Ride * Airport Drop
 * 12/11/2025 → ₹1,250.00 debited
 * Available Balance → ₹17,170.50
 */
function parseFormat2(text: string): ParserResult {
    const lines = text.split('\n').map(l => l.trim())

    const descMatch = lines[0]
    const dateAmountMatch = lines[1]?.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s*→\s*₹?([\d,]+\.?\d*)\s*(debited|credited)?/i)
    const balanceMatch = lines[2]?.match(/Balance.*?→\s*₹?([\d,]+\.?\d*)/i)

    if (!descMatch || !dateAmountMatch) {
        return { success: false }
    }

    try {
        const date = parseDate(dateAmountMatch[1])
        const description = descMatch
        let amount = parseAmount(dateAmountMatch[2])

        // If debited, make negative
        if (dateAmountMatch[3]?.toLowerCase() === 'debited') {
            amount = -Math.abs(amount)
        }

        const balance = balanceMatch ? parseAmount(balanceMatch[1]) : null

        // All required fields extracted successfully = 100% confidence
        const confidence = 100

        return {
            success: true,
            data: { date, description, amount, balance, confidence }
        }
    } catch (error) {
        return { success: false }
    }
}

/**
 * Format 3: Messy Format
 * Example:
 * txn123 2025-12-10 Amazon.in Order #403-1234567-8901234 ₹2,999.00 Dr Bal 14171.50 Shopping
 */
/**
 * Format 3: Messy Format
 * Example:
 * txn123 2025-12-10 Amazon.in Order #403-1234567-8901234 ₹2,999.00 Dr Bal 14171.50 Shopping
 */
function parseFormat3(text: string): ParserResult {
    // Extract date (YYYY-MM-DD format)
    const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/i)

    // Extract amount - strict check for ₹ symbol OR number immediately followed by Dr/Cr
    // Updated to allow Dr/Cr suffix even if ₹ is present
    const amountMatch = text.match(/(?:₹\s*([\d,]+\.?\d*)(?:\s*(Dr|Cr|Debit))?|([\d,]+\.?\d*)\s*(?:Dr|Cr|Debit))/i)

    // Extract balance
    const balanceMatch = text.match(/Bal\s*([\d,]+\.?\d*)/i)

    // Extract description
    let description = ''
    if (dateMatch && amountMatch) {
        const dateEnd = text.indexOf(dateMatch[0]) + dateMatch[0].length
        const amountStart = text.indexOf(amountMatch[0])

        // Take content between date and amount
        if (amountStart > dateEnd) {
            description = text.substring(dateEnd, amountStart).trim()

            // Cleanup: remove common prefixes/suffixes that might be caught
            description = description.replace(/^[-:\s]+/, '') // Remove leading separators
        }
    }

    if (!dateMatch || !amountMatch || !description) {
        return { success: false }
    }

    try {
        const date = parseDate(dateMatch[1])

        // Amount might be in capture group 1 (with ₹) or 2 (with Dr/Cr)
        const amountStr = amountMatch[1] || amountMatch[2]
        let amount = parseAmount(amountStr)

        // Check for Dr/Debit indication in the full match
        if (amountMatch[0].toLowerCase().includes('dr') || amountMatch[0].toLowerCase().includes('debit')) {
            amount = -Math.abs(amount)
        }

        const balance = balanceMatch ? parseAmount(balanceMatch[1]) : null

        // All required fields extracted successfully = 100% confidence
        const confidence = 100

        return {
            success: true,
            data: { date, description, amount, balance, confidence }
        }
    } catch (error) {
        return { success: false }
    }
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr: string): Date {
    // Try DD MMM YYYY format (11 Dec 2025)
    const format1 = /(\d{1,2})\s+(\w+)\s+(\d{4})/
    const match1 = dateStr.match(format1)
    if (match1) {
        const months: { [key: string]: number } = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
            jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
        }
        const month = months[match1[2].toLowerCase().substring(0, 3)]
        return new Date(parseInt(match1[3]), month, parseInt(match1[1]))
    }

    // Try DD/MM/YYYY or MM/DD/YYYY format
    const format2 = /(\d{1,2})\/(\d{1,2})\/(\d{4})/
    const match2 = dateStr.match(format2)
    if (match2) {
        // Assume DD/MM/YYYY for Indian context
        return new Date(parseInt(match2[3]), parseInt(match2[2]) - 1, parseInt(match2[1]))
    }

    // Try YYYY-MM-DD format
    const format3 = /(\d{4})-(\d{2})-(\d{2})/
    const match3 = dateStr.match(format3)
    if (match3) {
        return new Date(parseInt(match3[1]), parseInt(match3[2]) - 1, parseInt(match3[3]))
    }

    throw new Error('Unable to parse date')
}

/**
 * Parse amount from string, removing commas and currency symbols
 */
function parseAmount(amountStr: string): number {
    const cleaned = amountStr.replace(/[₹,]/g, '').trim()
    const amount = parseFloat(cleaned)

    if (isNaN(amount)) {
        throw new Error('Unable to parse amount')
    }

    return amount
}

/**
 * Calculate confidence score (0-100) based on extracted fields
 */
function calculateConfidence(params: {
    hasDate: boolean
    hasDescription: boolean
    hasAmount: boolean
    hasBalance: boolean
    descriptionLength: number
}): number {
    let confidence = 0

    if (params.hasDate) confidence += 30
    if (params.hasDescription) confidence += 30
    if (params.hasAmount) confidence += 30
    if (params.hasBalance) confidence += 10

    // Reduce confidence if description is too short or missing
    if (params.descriptionLength < 5) {
        confidence -= 15
    } else if (params.descriptionLength < 10) {
        confidence -= 5
    }

    return Math.max(0, Math.min(100, confidence))
}
