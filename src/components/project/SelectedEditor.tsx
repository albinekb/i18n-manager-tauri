import { TextField } from '@mui/material'
import React from 'react'
import { Project } from './hooks/useProject'
import dotProp from 'dot-prop'
import { useProjectContext } from '../app/ProjectContext'
import { useFormContext, useController } from 'react-hook-form'

type Props = {}

export default function SelectedEditor({}: Props) {
  const { project, setSelected, selected } = useProjectContext()
  if (!selected) return null
  return (
    <div>
      {project.languages.map((lang) => {
        const value = dotProp.get(project.languageTree, `${selected}.${lang}`)
        if (typeof value !== 'string') return selected
        return (
          <LangEditor
            key={`${lang}-${selected}`}
            lang={lang}
            selected={selected}
            project={project}
          />
        )
      })}
    </div>
  )
}

const LangEditor = ({ lang, selected, project }) => {
  const formContext = useFormContext()
  const { field, fieldState } = useController({
    control: formContext.control,
    name: `${selected}.${lang}`,
  })
  console.log(`${selected}.${lang}`)

  return (
    <div>
      <h1>{lang}</h1>
      <TextField
        {...field}
        helperText={fieldState.isDirty ? 'dirty' : ''}
        error={fieldState.isDirty}
        // color={fieldState.isDirty ? 'error' : 'primary'}
      />
    </div>
  )
}
