/**
 * Toast notification utilities
 * Wrapper around sonner for consistent usage across the app
 */
import { toast as sonnerToast } from 'sonner'

export const toast = {
  success: (message: string, description?: string) => {
    return sonnerToast.success(message, {
      description,
      duration: 3000,
    })
  },

  error: (message: string, description?: string) => {
    return sonnerToast.error(message, {
      description,
      duration: 4000,
    })
  },

  info: (message: string, description?: string) => {
    return sonnerToast.info(message, {
      description,
      duration: 3000,
    })
  },

  warning: (message: string, description?: string) => {
    return sonnerToast.warning(message, {
      description,
      duration: 3000,
    })
  },

  loading: (message: string, description?: string) => {
    return sonnerToast.loading(message, {
      description,
    })
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: Error) => string)
    }
  ) => {
    return sonnerToast.promise(promise, messages)
  },

  dismiss: (id?: string | number) => {
    sonnerToast.dismiss(id)
  },
}

// Usage examples:
// toast.success('Settings saved successfully')
// toast.error('Failed to connect to Ollama', 'Please check if Ollama is running')
// toast.loading('Connecting to Ollama...')
// toast.promise(fetchData(), {
//   loading: 'Loading...',
//   success: 'Data loaded!',
//   error: 'Failed to load data'
// })
