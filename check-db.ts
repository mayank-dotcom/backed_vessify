
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Checking Prisma Client Keys...')
    const keys = Object.keys(prisma)
    console.log('Keys on prisma instance:', keys)

    // Check specifically for jwks
    if ('jwks' in prisma) {
        console.log('prisma.jwks exists!')
    } else {
        console.log('prisma.jwks DOES NOT EXIST')
    }

    try {
        // Try to query
        // @ts-ignore
        const count = await prisma.jwks.count()
        console.log('Jwks count:', count)
    } catch (e) {
        console.error('Error querying jwks:', e)
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
