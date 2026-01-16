import { Toaster } from 'sonner'

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      theme="dark"
      toastOptions={{
        style: {
          background: '#18181b',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#fafafa',
        },
        className: 'sonner-toast',
      }}
    />
  )
}
