import Toast, { ToastShowParams } from 'react-native-toast-message';

// Mapping from our simple type to react-native-toast-message types
type ToastType = 'success' | 'error' | 'info';

interface CustomToastProps {
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number; // Milliseconds
  // Add other props supported by react-native-toast-message if needed
  // e.g., onPress, onHide, etc.
  props?: Record<string, any>; // For custom props in custom toast types
}

// The hook itself becomes much simpler
function useToast() {
  const showToast = ({
    title,
    message,
    type = 'info', // Default to 'info'
    duration = 4000, // Default duration
    props = {},
  }: CustomToastProps) => {

    const toastParams: ToastShowParams = {
      type: type,
      text1: title, // text1 is typically used for the title
      text2: message, // text2 for the message body
      visibilityTime: duration,
      autoHide: true,
      props: props, // Pass through any custom props
    };

    Toast.show(toastParams);
  };

  // The `toast` function from the original hook can be an alias to showToast
  // or can be structured to match the previous API if preferred,
  // but a simpler API is often better.
  // For now, just providing a direct showToast.
  // The old API returned id, dismiss, update - these are less relevant here.

  return {
    show: showToast, // Expose a 'show' method
    // For compatibility with the previous structure if some code used `toast()`
    // This is a simplified version
    toast: (params: { title?: string, description: string, variant?: 'default' | 'destructive' }) => {
        showToast({
            title: params.title,
            message: params.description,
            type: params.variant === 'destructive' ? 'error' : 'info',
        });
    },
    // dismiss is handled by react-native-toast-message itself or by Toast.hide()
    // For global dismissal, one could call Toast.hide() directly.
    dismiss: (toastId?: string) => { // toastId is not used by react-native-toast-message's global hide
        Toast.hide();
    }
  };
}

// A global toast function instance for convenience if needed outside React components,
// though using the hook is generally preferred.
const toast = (params: CustomToastProps) => {
    Toast.show({
        type: params.type || 'info',
        text1: params.title,
        text2: params.message,
        visibilityTime: params.duration || 4000,
        autoHide: true,
        props: params.props || {},
    });
};


export { useToast, toast };
