import {
  Button,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import React from 'react'
import dotProp from 'dot-prop'

import { useFormContext, useController } from 'react-hook-form'
import { ClearOutlined } from '@mui/icons-material'
import clsx from 'clsx'
import TranslateSection from '../Translate/TranslateSection'
import {
  contextMenuAtom,
  projectLanguagesAtom,
  projectLanguageTreeAtom,
  searchStringAtoms,
  selectedKeyAtom,
} from '../app/atoms'
import { useAtomValue, useSetAtom } from 'jotai/react'

type Props = {}

export default function SelectedEditor({}: Props) {
  const isSearching = useAtomValue(searchStringAtoms.isDebouncingAtom)
  const formContext = useFormContext()
  const selected = useAtomValue(selectedKeyAtom)
  const languages = useAtomValue(projectLanguagesAtom)
  const languageTree = useAtomValue(projectLanguageTreeAtom)
  const isNode = selected && formContext.getValues(selected)
  if (isSearching) return null
  if (!selected) return null
  if (!isNode) {
    return <div>Node not found</div>
  }
  return (
    <Stack spacing={2} className='flex-1 px-4 overflow-y-auto py-4'>
      <div>
        <Card variant='outlined'>
          <CardContent>
            <Typography
              sx={{ fontSize: 14 }}
              color='text.secondary'
              gutterBottom
            >
              Selected key
            </Typography>
            <SelectedKeyHeader selected={selected} />
          </CardContent>
        </Card>
      </div>
      <TranslateSection />
      {languages.map((lang) => {
        const value = dotProp.get(languageTree, `${selected}.${lang}`)
        if (
          (typeof value === 'object' || value === undefined) &&
          typeof formContext.getValues(`${selected}.${lang}`) !== 'string'
        ) {
          return selected
        }
        return (
          <LangEditor
            key={`${lang}-${selected}`}
            lang={lang}
            selected={selected}
          />
        )
      })}
      {selected && <ResetButton selected={selected} />}
    </Stack>
  )
}

const SelectedKeyHeader = ({ selected }: { selected: string }) => {
  const parts = selected.split('.')
  const setContextMenu = useSetAtom(contextMenuAtom)

  return (
    <Typography variant='h5' component='div'>
      {parts.map((part, index) => {
        const isLast = index === parts.length - 1
        const onClick = (event: any) => {
          const dataId = parts.slice(0, index + 1).join('.')
          const data = {
            id: dataId,
            key: dataId.split('.').slice(-1)[0] || dataId,
            type: isLast ? 'value' : 'parent',
          }
          setContextMenu({
            mouseX: event.clientX + 2,
            mouseY: event.clientY - 6,
            data,
          })
        }
        return (
          <span key={part}>
            <span onClick={onClick} className='cursor-pointer hover:underline'>
              {part}
            </span>
            {!isLast && <span>.</span>}
          </span>
        )
      })}
    </Typography>
  )
}

const ResetButton = ({ selected }: { selected: string }) => {
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

const LangEditor = ({ lang, selected }: { lang: string; selected: string }) => {
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
        color={fieldState.isDirty ? 'warning' : 'primary'}
        fullWidth
        focused={fieldState.isDirty ? true : undefined}
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
