import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding initial Super Admin user...')

    const defaultAdminEmail = 'admin@sarpadang.go.id'
    const defaultPassword = 'adminpassword123'
    const passwordHash = await bcrypt.hash(defaultPassword, 10)

    const admin = await prisma.user.upsert({
        where: { email: defaultAdminEmail },
        update: {
            passwordHash,
            name: 'Super Admin',
            role: 'admin',
        },
        create: {
            email: defaultAdminEmail,
            passwordHash,
            name: 'Super Admin',
            role: 'admin',
        },
    })

    console.log(`Admin user created/updated successfully:`)
    console.log(`- Email: ${admin.email}`)
    console.log(`- Role: ${admin.role}`)
    console.log(`- Password: ${defaultPassword}`)
}

main()
    .catch((e) => {
        console.error('Seed error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
