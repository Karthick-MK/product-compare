import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SYSTEM_CATEGORIES = [
  {
    name: 'Fitness Equipment',
    defaultSpecKeys: ['Weight Range', 'Increments', 'Material', 'Dimensions', 'Max Load'],
  },
  {
    name: 'Protein Supplements',
    defaultSpecKeys: ['Protein / Serving', 'Calories', 'Primary Source', 'Amino Profile', 'Servings'],
  },
  {
    name: 'Mobile Phones',
    defaultSpecKeys: ['Display', 'Processor', 'RAM', 'Storage', 'Battery', 'Camera', 'OS'],
  },
  {
    name: 'Laptops',
    defaultSpecKeys: ['Processor', 'RAM', 'Storage', 'Display', 'Battery Life', 'Weight', 'OS'],
  },
  {
    name: 'Headphones',
    defaultSpecKeys: ['Driver Size', 'Frequency Response', 'Noise Cancellation', 'Battery', 'Connectivity'],
  },
  {
    name: 'General',
    defaultSpecKeys: ['Key Feature 1', 'Key Feature 2', 'Key Feature 3', 'Material', 'Warranty'],
  },
]

async function main() {
  // ponytail: createMany+skipDuplicates is idempotent and avoids the broken upsert-by-id pattern
  await prisma.category.createMany({
    data: SYSTEM_CATEGORIES.map(cat => ({ name: cat.name, defaultSpecKeys: cat.defaultSpecKeys })),
    skipDuplicates: true,
  })

  const adminUserId = process.env.ADMIN_CLERK_USER_ID
  if (adminUserId) {
    await prisma.workspace.upsert({
      where: { ownerUserId: adminUserId },
      update: { plan: 'admin' },
      create: {
        ownerUserId: adminUserId,
        slug: 'admin',
        plan: 'admin',
        brandingEnabled: false,
      },
    })
    console.log('Admin workspace created/updated')
  }

  console.log('Seed complete')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
