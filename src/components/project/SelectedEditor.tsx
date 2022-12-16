import {
  Button,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import React from 'react'
import { Project } from './hooks/useProject'
import dotProp from 'dot-prop'
import { useProjectContext } from '../app/ProjectContext'
import { useFormContext, useController } from 'react-hook-form'
import { ClearOutlined } from '@mui/icons-material'
import clsx from 'clsx'

type Props = {}

export default function SelectedEditor({}: Props) {
  const { project, setSelected, selected } = useProjectContext()
  const formContext = useFormContext()
  if (!selected) return null
  return (
    <Stack className='flex-1 px-4' spacing={2}>
      <Typography variant='h5'>{selected}</Typography>
      {project.languages.map((lang) => {
        const value = dotProp.get(project.languageTree, `${selected}.${lang}`)
        if (
          (typeof value === 'object' || value === undefined) &&
          typeof formContext.getValues(`${selected}.${lang}`) !== 'string'
        )
          return selected
        return (
          <LangEditor
            key={`${lang}-${selected}`}
            lang={lang}
            selected={selected}
            project={project}
          />
        )
      })}
      <ResetButton selected={selected} project={project} />
    </Stack>
  )
}

const ResetButton = ({ selected, project }) => {
  const formContext = useFormContext()
  const isDirty = formContext.getFieldState(selected).isDirty
  if (!isDirty) return null
  return (
    <Button
      color='error'
      variant='outlined'
      onClick={() => formContext.resetField(selected)}
    >
      Reset Form
    </Button>
  )
}

const LangEditor = ({ lang, selected, project }) => {
  const formContext = useFormContext()
  const name = `${selected}.${lang}`
  const { field, fieldState } = useController({
    control: formContext.control,
    name,
  })

  return (
    <div>
      <TextField
        {...field}
        label={lang}
        // helperText={fieldState.isDirty ? 'dirty' : ''}
        error={fieldState.isDirty}
        fullWidth
        InputProps={{
          endAdornment: (
            <InputAdornment
              position='end'
              className={clsx(
                !fieldState.isDirty && 'opacity-0 pointer-events-none',
              )}
            >
              <IconButton onClick={() => formContext.resetField(name)}>
                <ClearOutlined />
              </IconButton>
            </InputAdornment>
          ),
        }}
        // color={fieldState.isDirty ? 'error' : 'primary'}
      />
    </div>
  )
}
