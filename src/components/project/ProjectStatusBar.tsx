import { Avatar, Badge, Chip, Stack, Toolbar, Typography } from '@mui/material'
import React, { useMemo } from 'react'
import { useFormContext, useFormState } from 'react-hook-form'
import traverse from 'traverse'
import { useProjectContext } from '../app/ProjectContext'

type Props = {}

export default function ProjectStatusBar({}: Props) {
  const projectContext = useProjectContext()
  const { isDirty } = useFormState()
  const { formState } = useFormContext()
  const languages = projectContext.project.languages

  const [dirtyFields, dirtyKeys] = useMemo(
    () =>
      traverse(formState.dirtyFields)
        .reduce(
          function ([fields, keys]: [number, Set<string>], val) {
            if (this.isLeaf && val === true) fields++
            if (
              !this.isLeaf &&
              typeof val === 'object' &&
              languages.some((lang) => val[lang] === true)
            ) {
              keys.add(this.key)
            }

            return [fields, keys]
          },
          [0, new Set()],
        )
        .map((val) => val?.size || val || 0),
    [formState, languages],
  )

  return (
    <Toolbar
      variant='dense'
      className='w-full bg-gray-200 border-t border-gray-300'
    >
      <Stack
        direction='row'
        alignItems='center'
        justifyContent='space-between'
        spacing={2}
        width='100%'
      >
        <Typography variant='subtitle2'>
          {isDirty ? 'dirty' : 'clean'}
        </Typography>
        <Stack direction='row' gap={1}>
          <Chip
            avatar={
              <Avatar
                sx={{
                  bgcolor: isDirty ? 'warning.main' : 'success.main',
                }}
                className='text-white'
              >
                {dirtyFields}
              </Avatar>
            }
            label='Dirty fields'
          />
          <Chip
            avatar={
              <Avatar
                sx={{
                  bgcolor: isDirty ? 'warning.main' : 'success.main',
                }}
                className='text-white'
              >
                {dirtyKeys}
              </Avatar>
            }
            label='Dirty keys'
          />
        </Stack>
      </Stack>
    </Toolbar>
  )
}
