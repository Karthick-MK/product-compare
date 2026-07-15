import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db/prisma'
import type { Workspace } from '@/types'

export async function getCurrentWorkspace(): Promise<Workspace> {
  const { userId } = auth()
  if (!userId) throw new Error('Unauthorized')

  let workspace = await db.workspace.findUnique({
    where: { ownerUserId: userId },
  })

  const isAdmin = userId === process.env.ADMIN_CLERK_USER_ID

  if (!workspace) {
    workspace = await db.workspace.create({
      data: {
        ownerUserId: userId,
        slug: userId.slice(-8),
        plan: isAdmin ? 'admin' : 'free',
        brandingEnabled: true,
      },
    })
  } else if (isAdmin && workspace.plan !== 'admin') {
    // Upgrade existing workspace to admin if env var set
    workspace = await db.workspace.update({
      where: { id: workspace.id },
      data: { plan: 'admin' },
    })
  }

  return workspace as Workspace
}
