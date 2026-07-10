import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db/prisma'
import type { Workspace } from '@/types'

export async function getCurrentWorkspace(): Promise<Workspace> {
  const { userId } = auth()
  if (!userId) throw new Error('Unauthorized')

  let workspace = await db.workspace.findUnique({
    where: { ownerUserId: userId },
  })

  if (!workspace) {
    // Auto-create workspace on first login
    workspace = await db.workspace.create({
      data: {
        ownerUserId: userId,
        slug: userId.slice(-8), // temp slug, user can change later
        plan: 'free',
        brandingEnabled: true,
      },
    })
  }

  return workspace as Workspace
}
