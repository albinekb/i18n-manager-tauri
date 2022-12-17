import { Badge, BadgeProps } from '@mui/material'
import React from 'react'

interface StaticBadgeProps extends BadgeProps {}

export default function StaticBadge(props: StaticBadgeProps) {
  return (
    <Badge {...props} classes={{ badge: 'transform scale-100 relative' }} />
  )
}
