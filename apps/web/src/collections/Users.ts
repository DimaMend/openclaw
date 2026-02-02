import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'createdAt']
  },
  auth: {
    tokenExpiration: 28800, // 8 hours
    cookies: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    }
  },
  access: {
    create: ({ req: { user } }) => {
      // Only admins can create users
      return user?.role === 'admin'
    },
    read: () => true,
    update: ({ req: { user }, id }) => {
      // Users can update themselves, admins can update anyone
      if (user?.role === 'admin') return true
      return user?.id === id
    },
    delete: ({ req: { user } }) => {
      // Only admins can delete users
      return user?.role === 'admin'
    }
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true
    },
    {
      name: 'name',
      type: 'text',
      required: false
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'viewer',
      options: [
        {
          label: 'Admin',
          value: 'admin'
        },
        {
          label: 'Operator',
          value: 'operator'
        },
        {
          label: 'Viewer',
          value: 'viewer'
        }
      ],
      admin: {
        description: 'Admin: full access | Operator: manage assigned bots | Viewer: read-only'
      }
    },
    {
      name: 'assignedBots',
      type: 'relationship',
      relationTo: 'bots',
      hasMany: true,
      admin: {
        description: 'Bots this user can manage (Operators only)',
        condition: (data) => data?.role === 'operator'
      }
    },
    {
      name: 'preferences',
      type: 'json',
      admin: {
        description: 'User preferences and settings'
      }
    }
  ]
}
