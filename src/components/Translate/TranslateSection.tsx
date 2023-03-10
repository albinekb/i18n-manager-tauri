import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
} from '@mui/material'
import React, { Suspense, useCallback, useMemo } from 'react'

import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { Stack } from '@mui/system'
import dotProp from 'dot-prop'
import { translate } from '../../lib/translate'
import { getTranslateApiKey } from '../../lib/getTranslateApiKey'
import axios from 'axios'
import { useFormContext } from 'react-hook-form'
import {
  projectLanguagesAtom,
  getSelectedKeyAtom,
  translationAtom,
  TranslationState,
} from '../../store/atoms'
import { useAtom, useAtomValue } from 'jotai/react'

type Props = {}

export default function TranslateSection({}: Props) {
  return (
    <Accordion
      classes={{ root: 'before:border-none rounded' }}
      variant='outlined'
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <span className='font-semibold'>Translate</span>
      </AccordionSummary>
      <AccordionDetails>
        <Suspense fallback={<CircularProgress />}>
          <TranslationForm />
        </Suspense>
      </AccordionDetails>
    </Accordion>
  )
}

function TranslationForm() {
  const selected = useAtomValue(getSelectedKeyAtom)
  const languages = useAtomValue(projectLanguagesAtom)
  const [state, setState] = useAtom(translationAtom)
  const formContext = useFormContext()
  const [loading, setLoading] = React.useState(false)
  // const options = useMemo(() => project.languages.map((lang) => ({ id:lang, title: lang })), [project.languages])
  const onSubmit = useCallback(async () => {
    const apiKey = await getTranslateApiKey()
    if (state.mode !== 'this') {
      return
    }
    if (!apiKey) {
      alert('No API key')
      return
    }
    const from = formContext.getValues(`${selected}.${state.fromLanguage}`)
    if (!from) {
      alert('No text to translate')
      return
    }
    try {
      setLoading(true)
      if (!state.fromLanguage) {
        throw new Error('No from language')
      }
      for (const to of state.toLanguages) {
        const currentValue = formContext.getValues(`${selected}.${to}`)
        if (currentValue && !state.overwrite) {
          continue
        }
        const cancelToken = axios.CancelToken.source()
        const result = await translate(
          from,
          state.fromLanguage,
          to,
          apiKey,
          cancelToken,
        )

        formContext.setValue(`${selected}.${to}`, result, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        })
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [state, selected])

  const disabled =
    (state.mode === 'this' && !selected) ||
    !state.fromLanguage ||
    !state.toLanguages.length
  return (
    <form>
      <Stack spacing={2}>
        <Autocomplete
          id='fromLanguage'
          options={languages}
          value={state.fromLanguage || null}
          multiple={false}
          onChange={(event, newValue) => {
            setState({
              toLanguages: state.toLanguages.filter(
                (lang) => lang !== newValue,
              ),
              fromLanguage: newValue as unknown as string,
            })
          }}
          getOptionLabel={(option) => option}
          renderInput={(params) => (
            <TextField
              {...params}
              variant='outlined'
              size='small'
              label='From language'
            />
          )}
          clearOnBlur
        />

        <Autocomplete
          multiple
          clearOnBlur
          id='toLanguages'
          options={languages.filter((lang) => lang !== state.fromLanguage)}
          value={state.toLanguages || []}
          getOptionLabel={(option) => option}
          onChange={(event, newValue) => {
            setState({
              toLanguages: newValue,
            })
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              variant='outlined'
              size='small'
              label='To languages'
            />
          )}
        />
        <Stack direction='row' spacing={2} alignItems='center'>
          <RadioGroup
            value={state.mode}
            onChange={(event) => {
              setState({
                mode: event.target.value as unknown as 'all' | 'this',
              })
            }}
          >
            <FormControlLabel
              value='this'
              control={<Radio size='small' />}
              label='This'
            />
            <FormControlLabel
              value='all'
              control={<Radio size='small' />}
              label='All'
            />
          </RadioGroup>
          <FormGroup>
            <FormControlLabel
              value={state.overwrite}
              onChange={(event, checked) => {
                setState({
                  overwrite: checked,
                })
              }}
              control={<Checkbox />}
              label='Overwrite not empty fields'
            />
          </FormGroup>
          <Button
            variant='contained'
            size='small'
            disabled={disabled || loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
            onClick={onSubmit}
          >
            Translate
          </Button>
        </Stack>
      </Stack>
    </form>
  )
}
